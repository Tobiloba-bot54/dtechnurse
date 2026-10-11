import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getAdminFeatureSettings, saveAdminFeatureSettings } from '@/lib/services/features';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const settings = await getAdminFeatureSettings();
  return Response.json(settings, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  if (typeof body.relatedArticles !== 'boolean') return jsonError('relatedArticles must be true or false.', 400);
  try {
    await saveAdminFeatureSettings({ relatedArticles: body.relatedArticles });
    return Response.json({ ok: true, relatedArticles: body.relatedArticles }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save feature settings. Check database configuration and migrations.', 409);
  }
}
