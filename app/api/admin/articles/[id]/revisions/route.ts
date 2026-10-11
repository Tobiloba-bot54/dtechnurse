import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';
type Revision = { id: string; article_id: string; title: string; excerpt: string; body_html: string; changed_by: string | null; created_at: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  try {
    const result = await db.prepare('SELECT id, article_id, title, excerpt, body_html, changed_by, created_at FROM article_revisions WHERE article_id = ? ORDER BY created_at DESC LIMIT 50').bind(id).all<Revision>();
    return Response.json({ revisions: result.results || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return jsonError('Could not load revisions. Apply the latest migrations.', 503); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  let body: { revisionId?: unknown };
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  if (typeof body.revisionId !== 'string' || !body.revisionId) return jsonError('Choose a revision to restore.', 400);
  try {
    const current = await db.prepare('SELECT title, excerpt, body_html FROM articles WHERE id = ?').bind(id).first<{ title: string; excerpt: string; body_html: string }>();
    if (!current) return jsonError('Article not found.', 404);
    const revision = await db.prepare('SELECT title, excerpt, body_html FROM article_revisions WHERE id = ? AND article_id = ?').bind(body.revisionId, id).first<{ title: string; excerpt: string; body_html: string }>();
    if (!revision) return jsonError('Revision not found for this article.', 404);
    const backup = db.prepare('INSERT INTO article_revisions (id, article_id, title, excerpt, body_html, changed_by) VALUES (?, ?, ?, ?, ?, ?)').bind(randomUUID(), id, current.title, current.excerpt, current.body_html, auth.user.id);
    const restore = db.prepare('UPDATE articles SET title = ?, excerpt = ?, body_html = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(revision.title, revision.excerpt, revision.body_html, id);
    const audit = db.prepare('INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)').bind(randomUUID(), auth.user.id, 'article.revision_restore', 'article', id);
    if (db.batch) await db.batch([backup, restore, audit]); else { await backup.run(); await restore.run(); await audit.run(); }
    return Response.json({ ok: true, article: { id, title: revision.title, excerpt: revision.excerpt, body_html: revision.body_html } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return jsonError('Could not restore this revision.', 409); }
}
