import { randomUUID } from 'node:crypto';
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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const result = await db.prepare('SELECT * FROM editors ORDER BY display_name ASC').all();
  return Response.json({ editors: result.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
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
  const id = randomUUID();
  try {
    await db
      .prepare('INSERT INTO editors (id, slug, display_name, credentials, bio, avatar_url, social_links, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, slug, displayName, credentials, bio, avatarUrl, JSON.stringify(socialLinks), status)
      .run();
    return Response.json({ id, slug }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save the editor. The slug may already be in use.', 409);
  }
}
