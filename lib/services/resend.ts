import { getDatabase } from '@/lib/server/db';

const RESEND_SETTINGS_KEY = 'resend_settings';

export type ResendSettings = { apiKey: string; fromEmail: string; fromName: string };

export async function getResendSettings(): Promise<ResendSettings> {
  const db = getDatabase();
  const empty: ResendSettings = { apiKey: '', fromEmail: '', fromName: 'DTECHNURSE' };
  if (!db) return empty;
  const row = await db
    .prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1')
    .bind(RESEND_SETTINGS_KEY)
    .first<{ setting_value: string }>();
  if (!row) return empty;
  try {
    const parsed = JSON.parse(row.setting_value);
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      fromEmail: typeof parsed.fromEmail === 'string' ? parsed.fromEmail : '',
      fromName: typeof parsed.fromName === 'string' && parsed.fromName ? parsed.fromName : 'DTECHNURSE',
    };
  } catch {
    return empty;
  }
}

export async function saveResendSettings(settings: Partial<ResendSettings>): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const current = await getResendSettings();
  const next: ResendSettings = {
    apiKey: typeof settings.apiKey === 'string' ? settings.apiKey.trim().slice(0, 200) : current.apiKey,
    fromEmail: typeof settings.fromEmail === 'string' ? settings.fromEmail.trim().slice(0, 254) : current.fromEmail,
    fromName: typeof settings.fromName === 'string' && settings.fromName.trim() ? settings.fromName.trim().slice(0, 120) : current.fromName,
  };
  const value = JSON.stringify(next);
  await db
    .prepare(
      "INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(RESEND_SETTINGS_KEY, value)
    .run();
}

export type SendResult = { ok: true } | { ok: false; error: string };

export async function sendViaResend(params: { apiKey: string; from: string; to: string; subject: string; html: string }): Promise<SendResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.apiKey}` },
      body: JSON.stringify({ from: params.from, to: [params.to], subject: params.subject, html: params.html }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, error: `Resend returned ${response.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error sending email.' };
  }
}
