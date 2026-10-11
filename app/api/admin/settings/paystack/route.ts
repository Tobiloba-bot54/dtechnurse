import { getPaystackSettings, savePaystackSettings } from '@/lib/services/paystack';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { settings, source } = await getPaystackSettings();
  return Response.json({ secretKeyConfigured: Boolean(settings.secretKey), secretKeyMasked: settings.secretKey ? `${settings.secretKey.slice(0, 7)}••••••••${settings.secretKey.slice(-4)}` : '', publicKey: settings.publicKey, source }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const secretKey = typeof body.secretKey === 'string' ? body.secretKey.trim() : '';
  const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : '';
  if (secretKey && !/^(sk_test_|sk_live_)/.test(secretKey)) return jsonError('Use a valid Paystack secret key.', 400);
  if (publicKey && !/^(pk_test_|pk_live_)/.test(publicKey)) return jsonError('Use a valid Paystack public key.', 400);
  try {
    const current = await getPaystackSettings();
    await savePaystackSettings({ secretKey: secretKey || current.settings.secretKey, publicKey: publicKey || current.settings.publicKey });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return jsonError(error instanceof Error ? error.message : 'Could not save Paystack settings.', 503); }
}
