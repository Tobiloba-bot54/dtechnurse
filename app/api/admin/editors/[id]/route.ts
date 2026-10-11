import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160);

function parseSocialLinks(input: unknown): Array<{ platform: string; url: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      platform: typeof item.platform === 'string' ? item.platform.trim().slice(0, 60) : '',
      url: typeof item.url === 'string' ? item.url.trim().slice(0, 500) : '',
    }))
    .filter(item => item.platform && /^https?:\/\//i.test(item.url))
    .slice(0, 10);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  const editor = await db.prepare('SELECT * FROM editors WHERE id = ?').bind(id).first();
  if (!editor) return jsonError('Editor not found.', 404);
  return Response.json({ editor }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  const existing = await db.prepare('SELECT id FROM editors WHERE id = ?').bind(id).first();
  if (!existing) return jsonError('Editor not found.', 404);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const displayName = cleanText(body.displayName, 160);
  const slugInput = cleanText(body.slug, 160);
  const slug = slugify(slugInput || displayName);
  const credentials = cleanText(body.credentials, 160);
  const bio = cleanText(body.bio, 2000);
  const avatarUrl = cleanText(body.avatarUrl, 500) || null;
  const status = body.status === 'hidden' ? 'hidden' : 'active';
  const socialLinks = parseSocialLinks(body.socialLinks);
  if (!displayName || !slug) return jsonError('Name and a valid slug are required.', 400);
  try {
    await db
      .prepare('UPDATE editors SET slug = ?, display_name = ?, credentials = ?, bio = ?, avatar_url = ?, social_links = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(slug, displayName, credentials, bio, avatarUrl, JSON.stringify(socialLinks), status, id)
      .run();
    return Response.json({ id, slug }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not update the editor. The slug may already be in use.', 409);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;
  try {
    await db.prepare('UPDATE articles SET editor_id = NULL WHERE editor_id = ?').bind(id).run();
    await db.prepare('DELETE FROM editors WHERE id = ?').bind(id).run();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not delete the editor.', 409);
  }
}
