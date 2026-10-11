import { deleteResource, listAdminResources, listResourceCategories, saveResource } from '@/lib/services/resources';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';

export async function GET() {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  try { return Response.json({ resources: await listAdminResources(), categories: await listResourceCategories() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return jsonError('Resources could not be loaded. Apply the resource database migration.', 503); }
}
export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  try { return Response.json(await saveResource(body), { status: 201, headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return jsonError(error instanceof Error ? error.message : 'Resource could not be saved.', 400); }
}
