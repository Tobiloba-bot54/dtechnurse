import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';

export const runtime = 'nodejs';
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return Response.json({ error: 'Database is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const result = await db.prepare("SELECT id, title, slug, status, published_at, updated_at FROM articles WHERE status IN ('scheduled','published','draft') ORDER BY CASE WHEN status = 'scheduled' THEN 0 WHEN status = 'draft' THEN 1 ELSE 2 END, published_at ASC, updated_at DESC LIMIT 200").all();
    return Response.json({ articles: result.results ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not load the editorial calendar.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
