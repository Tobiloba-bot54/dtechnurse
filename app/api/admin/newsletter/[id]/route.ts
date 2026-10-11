import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  const campaign = await db.prepare('SELECT * FROM newsletter_campaigns WHERE id = ?').bind(id).first();
  if (!campaign) return jsonError('Campaign not found.', 404);
  return Response.json({ campaign }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  const existing = await db.prepare('SELECT id, status FROM newsletter_campaigns WHERE id = ?').bind(id).first<{ id: string; status: string }>();
  if (!existing) return jsonError('Campaign not found.', 404);
  if (existing.status !== 'draft') return jsonError('Only draft campaigns can be edited.', 409);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const subject = cleanText(body.subject, 200);
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml.slice(0, 200000) : '';
  const articleId = cleanText(body.articleId, 100) || null;
  if (!subject) return jsonError('Subject is required.', 400);
  if (!bodyHtml.trim()) return jsonError('Email content is required.', 400);
  try {
    await db
      .prepare('UPDATE newsletter_campaigns SET subject = ?, body_html = ?, article_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(subject, bodyHtml, articleId, id)
      .run();
    return Response.json({ id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not update the newsletter draft.', 409);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  try {
    await db.prepare('DELETE FROM newsletter_campaigns WHERE id = ?').bind(id).run();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not delete the campaign.', 409);
  }
}
