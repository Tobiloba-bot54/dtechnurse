import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  try {
    const result = await db.prepare('SELECT id, name, slug, description FROM article_categories ORDER BY name ASC').all();
    return Response.json({ categories: result.results || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Apply the article category migrations first.', 503);
  }
}
