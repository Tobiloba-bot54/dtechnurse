import { requireAdmin } from '@/lib/server/supabase-auth';
import { getDatabase } from '@/lib/server/db';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return Response.json({ error: 'Database is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const [published, drafts, scheduled, categories, revisions] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM articles WHERE status = 'published' AND (published_at IS NULL OR datetime(published_at) <= CURRENT_TIMESTAMP)").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM articles WHERE status = 'draft'").first<{ count: number }>(),
      db.prepare("SELECT COUNT(*) AS count FROM articles WHERE status = 'scheduled'").first<{ count: number }>(),
      db.prepare('SELECT COUNT(*) AS count FROM article_categories').first<{ count: number }>(),
      db.prepare('SELECT COUNT(*) AS count FROM article_revisions').first<{ count: number }>(),
    ]);
    return Response.json({ published: published?.count ?? 0, drafts: drafts?.count ?? 0, scheduled: scheduled?.count ?? 0, categories: categories?.count ?? 0, revisions: revisions?.count ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Apply the latest database migrations before loading dashboard statistics.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
