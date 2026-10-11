// File: DTECHNURSE-SITE-main/app/api/admin/articles/[id]/route.ts
import { randomUUID } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';
const safeHtml = (html: string) => sanitizeHtml(html.slice(0, 200000), {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class'], a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'] },
  allowedSchemes: ['http', 'https', 'mailto'],
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  const article = await db.prepare('SELECT id, slug, title, excerpt, body_html, status, featured_media_id, seo_title, seo_description, canonical_url, published_at, created_at, updated_at FROM articles WHERE id = ?').bind(id).first();
  if (!article) return jsonError('Article not found.', 404);
  return Response.json({ article }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const existing = await db.prepare('SELECT id FROM articles WHERE id = ?').bind(id).first();
  if (!existing) return jsonError('Article not found.', 404);
  const title = cleanText(body.title, 180);
  const slug = cleanText(body.slug, 180).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const excerpt = cleanText(body.excerpt, 500);
  const html = typeof body.bodyHtml === 'string' ? safeHtml(body.bodyHtml) : '';
  const allowed = ['draft', 'published', 'scheduled', 'archived'];
  const status = allowed.includes(String(body.status)) ? String(body.status) : 'draft';
  const seoTitle = cleanText(body.seoTitle, 180) || null;
  const seoDescription = cleanText(body.seoDescription, 320) || null;
  const canonicalUrl = cleanText(body.canonicalUrl, 500) || null;
  const featuredMediaId = cleanText(body.featuredMediaId, 100) || null;
  if (!title || !slug) return jsonError('Title and a valid slug are required.', 400);
  try {
    const update = db.prepare("UPDATE articles SET slug = ?, title = ?, excerpt = ?, body_html = ?, status = ?, featured_media_id = ?, seo_title = ?, seo_description = ?, canonical_url = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(slug, title, excerpt, html, status, featuredMediaId, seoTitle, seoDescription, canonicalUrl, status, id);
    const revision = db.prepare('INSERT INTO article_revisions (id, article_id, title, excerpt, body_html, changed_by) VALUES (?, ?, ?, ?, ?, ?)').bind(randomUUID(), id, title, excerpt, html, auth.user.id);
    const audit = db.prepare('INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)').bind(randomUUID(), auth.user.id, `article.${status === 'published' ? 'publish' : 'update'}`, 'article', id);
    if (db.batch) await db.batch([update, revision, audit]);
    else { await update.run(); await revision.run(); await audit.run(); }
    return Response.json({ id, slug, status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not update the article. Check whether the slug is already in use and whether migrations are current.', 409);
  }
}
