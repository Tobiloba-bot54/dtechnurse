// File: app/api/admin/store/settings/route.ts
// Admin store settings with payment gateway and email service configuration.
import { requireStoreAdmin } from '@/lib/server/store-auth';
import { cleanText, jsonError, validEmail } from '@/lib/server/validation';
import { getEmailServiceConfig, getPaymentGatewayConfig, getStoreSettings, saveEmailServiceConfig, savePaymentGatewayConfig, saveStoreSettings } from '@/lib/services/store/settings';
import type { StoreSettings } from '@/lib/services/store/types';

export const runtime = 'nodejs';

type NumberSettingKey = { [K in keyof StoreSettings]: StoreSettings[K] extends number ? K : never }[keyof StoreSettings];
type StringSettingKey = { [K in keyof StoreSettings]: StoreSettings[K] extends string ? K : never }[keyof StoreSettings];
type BooleanSettingKey = { [K in keyof StoreSettings]: StoreSettings[K] extends boolean ? K : never }[keyof StoreSettings];

function maskSecret(value: string): string {
  return value ? `${value.slice(0, 7)}••••${value.slice(-4)}` : '';
}

function isSection(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const BOOLEAN_SETTINGS: BooleanSettingKey[] = [
  'homepageSectionEnabled',
  'whatsappChatEnabled',
  'moderatorCanDelete',
  'reviewsAutoApprove',
  'cacheEnabled',
  'regionShippingEnabled',
  'freeShippingRequiresAllItems',
  'stockReservationEnabled',
  'whatsappOrderNotificationsEnabled',
];

const NUMBER_SETTINGS: Array<[NumberSettingKey, string]> = [
  ['initialLoadCount', 'The initial load count must be a whole number of zero or more.'],
  ['disputeWindowHours', 'The dispute window must be a whole number of zero or more.'],
  ['lowStockDefaultThreshold', 'The low stock threshold must be a whole number of zero or more.'],
  ['loyaltyPointsPerOrder', 'Loyalty points per order must be a whole number of zero or more.'],
  ['referralRewardAmountKobo', 'The referral reward must be a whole amount of zero or more.'],
  ['orderAutoFinishDays', 'The auto finish days must be a whole number of zero or more.'],
  ['stockHoldMinutes', 'The stock hold minutes must be a whole number of zero or more.'],
];

const STRING_SETTINGS: Array<[StringSettingKey, number]> = [
  ['whatsappNumber', 40],
  ['referralRewardType', 40],
  ['refundMethod', 40],
  ['whatsappApiToken', 200],
  ['whatsappPhoneNumberId', 100],
];

export async function GET() {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  try {
    const [settings, paystack, flutterwave, email] = await Promise.all([
      getStoreSettings(),
      getPaymentGatewayConfig('paystack'),
      getPaymentGatewayConfig('flutterwave'),
      getEmailServiceConfig(),
    ]);
    return Response.json(
      {
        settings,
        paystack: { enabled: paystack.enabled, publicKey: paystack.publicKey, secretKeyMasked: maskSecret(paystack.secretKey), mode: paystack.mode, source: paystack.source },
        flutterwave: { enabled: flutterwave.enabled, publicKey: flutterwave.publicKey, secretKeyMasked: maskSecret(flutterwave.secretKey), mode: flutterwave.mode, source: flutterwave.source },
        email: { enabled: email.enabled, fromEmail: email.fromEmail, fromName: email.fromName, mode: email.mode, source: email.source, apiKeyMasked: maskSecret(email.apiKey) },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Store settings could not be loaded.', 503);
  }
}

export async function PUT(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  try {
    if (isSection(body.settings)) {
      const section = body.settings;
      const patch: Partial<StoreSettings> = {};
      if (section.name !== undefined) {
        const name = cleanText(section.name, 120);
        if (!name) return jsonError('The store name cannot be empty.', 400);
        patch.name = name;
      }
      if (section.defaultCurrency !== undefined) {
        const defaultCurrency = cleanText(section.defaultCurrency, 10);
        if (!defaultCurrency) return jsonError('A default currency is required.', 400);
        patch.defaultCurrency = defaultCurrency;
      }
      if (section.orderNumberPrefix !== undefined) {
        const orderNumberPrefix = cleanText(section.orderNumberPrefix, 12);
        if (!orderNumberPrefix) return jsonError('An order number prefix is required.', 400);
        patch.orderNumberPrefix = orderNumberPrefix;
      }
      for (const field of BOOLEAN_SETTINGS) {
        if (section[field] !== undefined) patch[field] = section[field] === true;
      }
      for (const [field, message] of NUMBER_SETTINGS) {
        if (section[field] === undefined) continue;
        const parsed = Number(section[field]);
        if (!Number.isInteger(parsed) || parsed < 0) return jsonError(message, 400);
        patch[field] = parsed;
      }
      for (const [field, maxLength] of STRING_SETTINGS) {
        if (section[field] !== undefined) patch[field] = cleanText(section[field], maxLength);
      }
      if (Object.keys(patch).length > 0) await saveStoreSettings(patch);
    }
    for (const provider of ['paystack', 'flutterwave'] as const) {
      const section = body[provider];
      if (!isSection(section)) continue;
      const current = await getPaymentGatewayConfig(provider);
      const enabled = section.enabled !== undefined ? section.enabled === true : current.enabled;
      let publicKey = typeof section.publicKey === 'string' ? section.publicKey.trim() : current.publicKey;
      if (!publicKey) publicKey = current.publicKey;
      let secretKey = typeof section.secretKey === 'string' ? section.secretKey.trim() : current.secretKey;
      if (!secretKey) secretKey = current.secretKey;
      const mode = section.mode === 'live' ? 'live' : section.mode === 'test' ? 'test' : current.mode;
      if (section.mode !== undefined && section.mode !== 'live' && section.mode !== 'test') return jsonError('The gateway mode must be test or live.', 400);
      if (provider === 'paystack') {
        if (secretKey && !/^(sk_test_|sk_live_)/.test(secretKey)) return jsonError('Use a valid Paystack secret key.', 400);
        if (publicKey && !/^(pk_test_|pk_live_)/.test(publicKey)) return jsonError('Use a valid Paystack public key.', 400);
      } else {
        if (secretKey.length > 200) return jsonError('The Flutterwave secret key is too long.', 400);
        if (publicKey.length > 200) return jsonError('The Flutterwave public key is too long.', 400);
      }
      await savePaymentGatewayConfig(provider, { enabled, publicKey, secretKey, mode });
    }
    if (isSection(body.email)) {
      const section = body.email;
      const current = await getEmailServiceConfig();
      const enabled = section.enabled !== undefined ? section.enabled === true : current.enabled;
      let apiKey = typeof section.apiKey === 'string' ? section.apiKey.trim() : current.apiKey;
      if (!apiKey) apiKey = current.apiKey;
      const fromEmail = typeof section.fromEmail === 'string' && section.fromEmail.trim() ? section.fromEmail.trim().slice(0, 254) : current.fromEmail;
      const fromName = typeof section.fromName === 'string' && section.fromName.trim() ? section.fromName.trim().slice(0, 120) : current.fromName;
      const mode = section.mode === 'live' ? 'live' : section.mode === 'test' ? 'test' : current.mode;
      if (section.mode !== undefined && section.mode !== 'live' && section.mode !== 'test') return jsonError('The email mode must be test or live.', 400);
      if (fromEmail && !validEmail(fromEmail)) return jsonError('Use a valid from email address.', 400);
      if (apiKey.length > 200) return jsonError('The email API key is too long.', 400);
      await saveEmailServiceConfig({ enabled, apiKey, fromEmail, fromName, mode });
    }
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Store settings could not be saved.', 503);
  }
}
