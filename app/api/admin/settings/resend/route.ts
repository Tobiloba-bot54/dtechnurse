import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getResendSettings, saveResendSettings } from '@/lib/services/resend';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const settings = await getResendSettings();
  const masked = settings.apiKey ? `${settings.apiKey.slice(0, 3)}${'•'.repeat(Math.max(0, settings.apiKey.length - 7))}${settings.apiKey.slice(-4)}` : '';
  return Response.json(
    { fromEmail: settings.fromEmail, fromName: settings.fromName, apiKeySet: Boolean(settings.apiKey), apiKeyMasked: masked },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
  const fromEmail = typeof body.fromEmail === 'string' ? body.fromEmail.trim() : undefined;
  const fromName = typeof body.fromName === 'string' ? body.fromName.trim() : undefined;
  if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) return jsonError('Enter a valid "from" email address.', 400);
  try {
    await saveResendSettings({
      ...(apiKey ? { apiKey } : {}),
      ...(fromEmail !== undefined ? { fromEmail } : {}),
      ...(fromName !== undefined ? { fromName } : {}),
    });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save Resend settings. Check whether migrations have been applied.', 409);
  }
}
