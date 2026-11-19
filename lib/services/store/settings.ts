import { cache } from 'react';
import { getDatabase, type SqlStatement } from '@/lib/server/db';
import type { StoreSettings } from './types';

const STORE_DEFAULTS: StoreSettings = {
  name: 'DTECHNURSE STORE',
  defaultCurrency: 'NGN',
  homepageSectionEnabled: true,
  initialLoadCount: 20,
  whatsappChatEnabled: true,
  whatsappNumber: '',
  disputeWindowHours: 24,
  lowStockDefaultThreshold: 5,
  moderatorCanDelete: false,
  reviewsAutoApprove: false,
  loyaltyPointsPerOrder: 0,
  cacheEnabled: true,
  regionShippingEnabled: true,
  freeShippingRequiresAllItems: true,
  referralRewardAmountKobo: 0,
  referralRewardType: 'cash',
  orderAutoFinishDays: 7,
  orderNumberPrefix: 'DTN',
  stockReservationEnabled: true,
  stockHoldMinutes: 15,
  refundMethod: 'manual',
  whatsappOrderNotificationsEnabled: false,
  whatsappApiToken: '',
  whatsappPhoneNumberId: '',
};

const STORE_SETTING_KEYS: Record<keyof StoreSettings, string> = {
  name: 'store_name',
  defaultCurrency: 'store_default_currency',
  homepageSectionEnabled: 'store_homepage_section_enabled',
  initialLoadCount: 'store_initial_load_count',
  whatsappChatEnabled: 'store_whatsapp_chat_enabled',
  whatsappNumber: 'store_whatsapp_number',
  disputeWindowHours: 'store_dispute_window_hours',
  lowStockDefaultThreshold: 'store_low_stock_default_threshold',
  moderatorCanDelete: 'store_moderator_can_delete',
  reviewsAutoApprove: 'store_reviews_auto_approve',
  loyaltyPointsPerOrder: 'store_loyalty_points_per_order',
  cacheEnabled: 'store_cache_enabled',
  regionShippingEnabled: 'store_region_shipping_enabled',
  freeShippingRequiresAllItems: 'store_free_shipping_requires_all_items',
  referralRewardAmountKobo: 'store_referral_reward_amount_kobo',
  referralRewardType: 'store_referral_reward_type',
  orderAutoFinishDays: 'store_order_auto_finish_days',
  orderNumberPrefix: 'store_order_number_prefix',
  stockReservationEnabled: 'store_stock_reservation_enabled',
  stockHoldMinutes: 'store_stock_hold_minutes',
  refundMethod: 'store_refund_method',
  whatsappOrderNotificationsEnabled: 'store_whatsapp_order_notifications_enabled',
  whatsappApiToken: 'store_whatsapp_api_token',
  whatsappPhoneNumberId: 'store_whatsapp_phone_number_id',
};

export const defaultStoreSettings: StoreSettings = { ...STORE_DEFAULTS };

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const db = getDatabase();
  if (!db) return { ...STORE_DEFAULTS };
  try {
    const keys = Object.values(STORE_SETTING_KEYS);
    const rows = await db
      .prepare(`SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${keys.map(() => '?').join(', ')})`)
      .bind(...keys)
      .all<{ setting_key: string; setting_value: string }>();
    const values = new Map<string, string>();
    for (const row of rows.results ?? []) values.set(row.setting_key, row.setting_value);
    const text = (field: keyof StoreSettings, fallback: string): string => {
      const raw = values.get(STORE_SETTING_KEYS[field]);
      return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
    };
    const flag = (field: keyof StoreSettings, fallback: boolean): boolean => {
      const raw = values.get(STORE_SETTING_KEYS[field]);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return fallback;
    };
    const count = (field: keyof StoreSettings, fallback: number): number => {
      const raw = values.get(STORE_SETTING_KEYS[field]);
      const parsed = raw === undefined ? NaN : parseInt(raw, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    };
    return {
      name: text('name', STORE_DEFAULTS.name),
      defaultCurrency: text('defaultCurrency', STORE_DEFAULTS.defaultCurrency),
      homepageSectionEnabled: flag('homepageSectionEnabled', STORE_DEFAULTS.homepageSectionEnabled),
      initialLoadCount: count('initialLoadCount', STORE_DEFAULTS.initialLoadCount),
      whatsappChatEnabled: flag('whatsappChatEnabled', STORE_DEFAULTS.whatsappChatEnabled),
      whatsappNumber: values.get(STORE_SETTING_KEYS.whatsappNumber) ?? STORE_DEFAULTS.whatsappNumber,
      disputeWindowHours: Math.max(1, count('disputeWindowHours', STORE_DEFAULTS.disputeWindowHours)),
      lowStockDefaultThreshold: count('lowStockDefaultThreshold', STORE_DEFAULTS.lowStockDefaultThreshold),
      moderatorCanDelete: flag('moderatorCanDelete', STORE_DEFAULTS.moderatorCanDelete),
      reviewsAutoApprove: flag('reviewsAutoApprove', STORE_DEFAULTS.reviewsAutoApprove),
      loyaltyPointsPerOrder: count('loyaltyPointsPerOrder', STORE_DEFAULTS.loyaltyPointsPerOrder),
      cacheEnabled: flag('cacheEnabled', STORE_DEFAULTS.cacheEnabled),
      regionShippingEnabled: flag('regionShippingEnabled', STORE_DEFAULTS.regionShippingEnabled),
      freeShippingRequiresAllItems: flag('freeShippingRequiresAllItems', STORE_DEFAULTS.freeShippingRequiresAllItems),
      referralRewardAmountKobo: count('referralRewardAmountKobo', STORE_DEFAULTS.referralRewardAmountKobo),
      referralRewardType: text('referralRewardType', STORE_DEFAULTS.referralRewardType),
      orderAutoFinishDays: count('orderAutoFinishDays', STORE_DEFAULTS.orderAutoFinishDays),
      orderNumberPrefix: text('orderNumberPrefix', STORE_DEFAULTS.orderNumberPrefix),
      stockReservationEnabled: flag('stockReservationEnabled', STORE_DEFAULTS.stockReservationEnabled),
      stockHoldMinutes: count('stockHoldMinutes', STORE_DEFAULTS.stockHoldMinutes),
      refundMethod: text('refundMethod', STORE_DEFAULTS.refundMethod),
      whatsappOrderNotificationsEnabled: flag('whatsappOrderNotificationsEnabled', STORE_DEFAULTS.whatsappOrderNotificationsEnabled),
      whatsappApiToken: values.get(STORE_SETTING_KEYS.whatsappApiToken) ?? STORE_DEFAULTS.whatsappApiToken,
      whatsappPhoneNumberId: values.get(STORE_SETTING_KEYS.whatsappPhoneNumberId) ?? STORE_DEFAULTS.whatsappPhoneNumberId,
    };
  } catch {
    return { ...STORE_DEFAULTS };
  }
});

export async function saveStoreSettings(patch: Partial<StoreSettings>): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const statements: SqlStatement[] = [];
  for (const field of Object.keys(STORE_SETTING_KEYS) as Array<keyof StoreSettings>) {
    const value = patch[field];
    if (value === undefined) continue;
    const serialized = typeof value === 'boolean' ? (value ? 'true' : 'false') : typeof value === 'number' ? String(Math.max(0, Math.floor(value))) : String(value);
    statements.push(
      db
        .prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP")
        .bind(STORE_SETTING_KEYS[field], serialized)
    );
  }
  if (!statements.length) return;
  if (db.batch) await db.batch(statements);
  else for (const statement of statements) await statement.run();
}

export type PaymentGatewayConfig = {
  enabled: boolean;
  publicKey: string;
  secretKey: string;
  mode: 'test' | 'live';
  source: 'admin' | 'legacy' | 'env' | 'missing';
};

type GatewayRow = { is_enabled: number; public_key: string; secret_key: string; mode: string };

export async function getPaymentGatewayConfig(provider: 'paystack' | 'flutterwave'): Promise<PaymentGatewayConfig> {
  const db = getDatabase();
  const row = db
    ? await db.prepare('SELECT is_enabled, public_key, secret_key, mode FROM payment_gateway_configs WHERE provider = ? LIMIT 1').bind(provider).first<GatewayRow>()
    : null;
  const mode: 'test' | 'live' = row?.mode === 'live' ? 'live' : 'test';
  if (row && row.secret_key.trim()) {
    return { enabled: row.is_enabled === 1, publicKey: row.public_key.trim(), secretKey: row.secret_key.trim(), mode, source: 'admin' };
  }
  if (provider === 'paystack') {
    const enabled = row ? row.is_enabled === 1 : true;
    let legacy: { secretKey?: unknown; publicKey?: unknown } = {};
    if (db) {
      const saved = await db.prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'paystack_settings' LIMIT 1").first<{ setting_value: string }>();
      if (saved?.setting_value) {
        try { legacy = JSON.parse(saved.setting_value) as typeof legacy; } catch { legacy = {}; }
      }
    }
    const legacySecret = typeof legacy.secretKey === 'string' ? legacy.secretKey.trim() : '';
    const legacyPublic = typeof legacy.publicKey === 'string' ? legacy.publicKey.trim() : '';
    const envSecret = (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
    const envPublic = (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '').trim();
    if (legacySecret) {
      return { enabled, publicKey: legacyPublic || row?.public_key.trim() || envPublic, secretKey: legacySecret, mode, source: 'legacy' };
    }
    if (envSecret) {
      return { enabled, publicKey: row?.public_key.trim() || envPublic, secretKey: envSecret, mode, source: 'env' };
    }
    return { enabled: false, publicKey: row?.public_key.trim() ?? '', secretKey: '', mode, source: 'missing' };
  }
  const envSecret = (process.env.FLUTTERWAVE_SECRET_KEY ?? '').trim();
  const envPublic = (process.env.FLUTTERWAVE_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? '').trim();
  if (envSecret) {
    return { enabled: row ? row.is_enabled === 1 : true, publicKey: row?.public_key.trim() || envPublic, secretKey: envSecret, mode, source: 'env' };
  }
  return { enabled: false, publicKey: row?.public_key.trim() ?? '', secretKey: '', mode, source: 'missing' };
}

export async function savePaymentGatewayConfig(provider: 'paystack' | 'flutterwave', input: { enabled: boolean; publicKey: string; secretKey: string; mode: 'test' | 'live' }): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db
    .prepare(
      `INSERT INTO payment_gateway_configs (id, provider, is_enabled, public_key, secret_key, mode) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET is_enabled = excluded.is_enabled, public_key = excluded.public_key, secret_key = excluded.secret_key, mode = excluded.mode, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(`pgc-${provider}`, provider, input.enabled ? 1 : 0, input.publicKey.trim(), input.secretKey.trim(), input.mode === 'live' ? 'live' : 'test')
    .run();
}

export type EmailServiceConfig = {
  enabled: boolean;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  mode: 'test' | 'live';
  source: 'admin' | 'legacy' | 'env' | 'missing';
};

type EmailRow = { is_enabled: number; api_key: string; from_email: string; from_name: string; mode: string };

export async function getEmailServiceConfig(): Promise<EmailServiceConfig> {
  const db = getDatabase();
  const row = db
    ? await db.prepare("SELECT is_enabled, api_key, from_email, from_name, mode FROM email_service_configs WHERE provider = 'resend' LIMIT 1").first<EmailRow>()
    : null;
  const mode: 'test' | 'live' = row?.mode === 'live' ? 'live' : 'test';
  const fromEmail = row?.from_email.trim() ?? '';
  const fromName = row?.from_name.trim() ?? '';
  if (row && row.api_key.trim()) {
    return { enabled: row.is_enabled === 1, apiKey: row.api_key.trim(), fromEmail, fromName: fromName || 'DTECHNURSE STORE', mode, source: 'admin' };
  }
  let legacy: { apiKey?: unknown; fromEmail?: unknown; fromName?: unknown } = {};
  if (db) {
    const saved = await db.prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'resend_settings' LIMIT 1").first<{ setting_value: string }>();
    if (saved?.setting_value) {
      try { legacy = JSON.parse(saved.setting_value) as typeof legacy; } catch { legacy = {}; }
    }
  }
  const resolvedFromEmail = fromEmail || (typeof legacy.fromEmail === 'string' ? legacy.fromEmail.trim() : '');
  const resolvedFromName = fromName || (typeof legacy.fromName === 'string' && legacy.fromName.trim() ? legacy.fromName.trim() : '') || 'DTECHNURSE STORE';
  const enabled = row ? row.is_enabled === 1 : false;
  if (typeof legacy.apiKey === 'string' && legacy.apiKey.trim()) {
    return { enabled, apiKey: legacy.apiKey.trim(), fromEmail: resolvedFromEmail, fromName: resolvedFromName, mode, source: 'legacy' };
  }
  const envKey = (process.env.RESEND_API_KEY ?? '').trim();
  if (envKey) {
    return { enabled, apiKey: envKey, fromEmail: resolvedFromEmail, fromName: resolvedFromName, mode, source: 'env' };
  }
  return { enabled: false, apiKey: '', fromEmail: resolvedFromEmail, fromName: resolvedFromName, mode, source: 'missing' };
}

export async function saveEmailServiceConfig(input: { enabled: boolean; apiKey: string; fromEmail: string; fromName: string; mode: 'test' | 'live' }): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db
    .prepare(
      `INSERT INTO email_service_configs (id, provider, is_enabled, api_key, from_email, from_name, mode) VALUES ('esc-resend', 'resend', ?, ?, ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET is_enabled = excluded.is_enabled, api_key = excluded.api_key, from_email = excluded.from_email, from_name = excluded.from_name, mode = excluded.mode, updated_at = CURRENT_TIMESTAMP`
    )
    .bind(input.enabled ? 1 : 0, input.apiKey.trim(), input.fromEmail.trim(), input.fromName.trim(), input.mode === 'live' ? 'live' : 'test')
    .run();
}
