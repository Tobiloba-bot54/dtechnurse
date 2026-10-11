import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';

export const runtime = 'nodejs';
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return Response.json({ error: 'Database is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const [total, recent, popular, categories] = await Promise.all([
      db.prepare('SELECT COUNT(*) AS count FROM article_views').first<{ count: number }>(),
      db.prepare("SELECT viewed_on AS day, COUNT(*) AS views FROM article_views WHERE viewed_on >= date('now', '-13 days') GROUP BY viewed_on ORDER BY viewed_on").all<{ day: string; views: number }>(),
      db.prepare('SELECT a.id, a.title, a.slug, COUNT(v.id) AS views FROM articles a LEFT JOIN article_views v ON v.article_id = a.id WHERE a.status = \'published\' GROUP BY a.id ORDER BY views DESC, a.published_at DESC LIMIT 10').all<{ id: string; title: string; slug: string; views: number }>(),
      db.prepare("SELECT c.name, COUNT(DISTINCT acl.article_id) AS articles FROM article_categories c LEFT JOIN article_category_links acl ON acl.category_id = c.id GROUP BY c.id ORDER BY articles DESC LIMIT 12").all<{ name: string; articles: number }>(),
    ]);
    return Response.json({ totalViews: total?.count ?? 0, dailyViews: recent.results ?? [], popularArticles: popular.results ?? [], categories: categories.results ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Apply migration 0008 before loading analytics.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
