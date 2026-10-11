import { getDatabase } from '@/lib/server/db';

export type PaystackSettings = { secretKey: string; publicKey: string };
export type PaystackSettingsSource = 'admin' | 'env' | 'missing';

export async function getPaystackSettings(): Promise<{ settings: PaystackSettings; source: PaystackSettingsSource }> {
  const db = getDatabase();
  let saved: Partial<PaystackSettings> = {};
  if (db) {
    const row = await db.prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'paystack_settings' LIMIT 1").first<{ setting_value: string }>();
    if (row?.setting_value) {
      try { saved = JSON.parse(row.setting_value) as Partial<PaystackSettings>; } catch { saved = {}; }
    }
  }
  const secretKey = typeof saved.secretKey === 'string' && saved.secretKey.trim() ? saved.secretKey.trim() : (process.env.PAYSTACK_SECRET_KEY ?? '').trim();
  const publicKey = typeof saved.publicKey === 'string' && saved.publicKey.trim() ? saved.publicKey.trim() : (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '').trim();
  const source: PaystackSettingsSource = saved.secretKey ? 'admin' : secretKey ? 'env' : 'missing';
  return { settings: { secretKey, publicKey }, source };
}

export async function savePaystackSettings(input: PaystackSettings): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const value = JSON.stringify({ secretKey: input.secretKey.trim(), publicKey: input.publicKey.trim() });
  await db.prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES ('paystack_settings', ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP").bind(value).run();
}

export async function initializeTransaction(input: { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata?: Record<string, string> }): Promise<{ authorizationUrl: string; reference: string }> {
  const { settings } = await getPaystackSettings();
  if (!settings.secretKey) throw new Error('Paystack is not configured.');
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST', headers: { Authorization: `Bearer ${settings.secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, amount: input.amountKobo, reference: input.reference, callback_url: input.callbackUrl, metadata: input.metadata ?? {} }),
    cache: 'no-store',
  });
  const payload = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
  if (!response.ok || !payload.status || !payload.data?.authorization_url || !payload.data.reference) throw new Error(payload.message || 'Paystack checkout could not be initialized.');
  return { authorizationUrl: payload.data.authorization_url, reference: payload.data.reference };
}

export async function verifyTransaction(reference: string): Promise<{ status: string; reference: string; amount: number; currency: string; email: string }> {
  const { settings } = await getPaystackSettings();
  if (!settings.secretKey) throw new Error('Paystack is not configured.');
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${settings.secretKey}` }, cache: 'no-store' });
  const payload = await response.json() as { status?: boolean; message?: string; data?: { status?: string; reference?: string; amount?: number; currency?: string; customer?: { email?: string } } };
  const data = payload.data;
  if (!response.ok || !payload.status || !data?.reference) throw new Error(payload.message || 'Paystack verification failed.');
  return { status: data.status ?? 'unknown', reference: data.reference, amount: Number(data.amount ?? 0), currency: data.currency ?? '', email: data.customer?.email ?? '' };
}
