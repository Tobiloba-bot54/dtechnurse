// File: DTECHNURSE-SITE-main/app/api/admin/pages/[id]/route.ts
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
  const page = await db.prepare('SELECT id, slug, title, body_html, seo_title, seo_description, updated_at FROM editable_pages WHERE id = ?').bind(id).first();
  if (!page) return jsonError('Page not found.', 404);
  return Response.json({ page }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  const existing = await db.prepare('SELECT id, slug FROM editable_pages WHERE id = ?').bind(id).first<{ id: string; slug: string }>();
  if (!existing) return jsonError('Page not found.', 404);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const title = cleanText(body.title, 180);
  const html = typeof body.bodyHtml === 'string' ? safeHtml(body.bodyHtml) : '';
  const seoTitle = cleanText(body.seoTitle, 180) || null;
  const seoDescription = cleanText(body.seoDescription, 320) || null;
  if (!title) return jsonError('A title is required.', 400);
  try {
    await db
      .prepare('UPDATE editable_pages SET title = ?, body_html = ?, seo_title = ?, seo_description = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(title, html, seoTitle, seoDescription, auth.user.id, id)
      .run();
    return Response.json({ id, slug: existing.slug }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not update the page.', 409);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  await db.prepare('DELETE FROM editable_pages WHERE id = ?').bind(id).run();
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
