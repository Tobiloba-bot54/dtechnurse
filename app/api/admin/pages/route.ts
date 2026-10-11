// File: DTECHNURSE-SITE-main/app/api/admin/pages/route.ts
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

const SLUG_WHITELIST = new Set(['about', 'privacy', 'contact']);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const result = await db.prepare('SELECT id, slug, title, body_html, seo_title, seo_description, updated_at FROM editable_pages ORDER BY slug ASC').all();
  return Response.json({ pages: result.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const slug = cleanText(body.slug, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  if (!SLUG_WHITELIST.has(slug)) return jsonError('Unknown page. Expected one of: about, privacy, contact.', 400);
  const title = cleanText(body.title, 180);
  const html = typeof body.bodyHtml === 'string' ? safeHtml(body.bodyHtml) : '';
  const seoTitle = cleanText(body.seoTitle, 180) || null;
  const seoDescription = cleanText(body.seoDescription, 320) || null;
  if (!title) return jsonError('A title is required.', 400);
  const id = randomUUID();
  try {
    await db
      .prepare(
        'INSERT INTO editable_pages (id, slug, title, body_html, seo_title, seo_description, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, body_html = excluded.body_html, seo_title = excluded.seo_title, seo_description = excluded.seo_description, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP'
      )
      .bind(id, slug, title, html, seoTitle, seoDescription, auth.user.id)
      .run();
    const audit = db.prepare('INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)').bind(randomUUID(), auth.user.id, 'page.save', 'editable_page', slug);
    await audit.run();
    return Response.json({ slug }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save the page. Check whether migrations have been applied.', 409);
  }
}
