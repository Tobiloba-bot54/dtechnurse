// File: DTECHNURSE-SITE-main/app/api/admin/articles/route.ts
import { randomUUID } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';
const safeHtml = (html: string) => sanitizeHtml(html, {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class'], a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'] },
  allowedSchemes: ['http', 'https', 'mailto'],
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const result = await db.prepare('SELECT id, slug, title, excerpt, status, editor_id, published_at, updated_at FROM articles ORDER BY updated_at DESC LIMIT 100').all();
  return Response.json({ articles: result.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const title = cleanText(body.title, 180);
  const slug = cleanText(body.slug, 180).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const excerpt = cleanText(body.excerpt, 500);
  const html = typeof body.bodyHtml === 'string' ? safeHtml(body.bodyHtml.slice(0, 200000)) : '';
  const status = body.status === 'published' ? 'published' : 'draft';
  const editorId = cleanText(body.editorId, 100) || null;
  if (!title || !slug) return jsonError('Title and a valid slug are required.', 400);
  const id = randomUUID();
  try {
    const articleInsert = db.prepare("INSERT INTO articles (id, slug, title, excerpt, body_html, status, author_id, editor_id, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)").bind(id, slug, title, excerpt, html, status, auth.user.id, editorId, status);
    const revisionInsert = db.prepare('INSERT INTO article_revisions (id, article_id, title, excerpt, body_html, changed_by) VALUES (?, ?, ?, ?, ?, ?)').bind(randomUUID(), id, title, excerpt, html, auth.user.id);
    if (db.batch) await db.batch([articleInsert, revisionInsert]);
    else { await articleInsert.run(); await revisionInsert.run(); }
    return Response.json({ id, slug, status }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save the article. Check whether the slug is already in use and that migrations have been applied.', 409);
  }
}
