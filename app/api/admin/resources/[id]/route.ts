import { deleteResource, saveResource } from '@/lib/services/resources';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  try { return Response.json(await saveResource(body, id), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return jsonError(error instanceof Error ? error.message : 'Resource could not be saved.', 400); }
}
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try { await deleteResource(id); return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return jsonError('Resource could not be deleted.', 500); }
}
