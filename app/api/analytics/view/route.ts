import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/db';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('Invalid request.', 400); }
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const articleId = typeof data.articleId === 'string' ? data.articleId.slice(0, 100) : '';
  if (!articleId) return jsonError('Article is required.', 400);
  const db = getDatabase();
  if (!db) return jsonError('Analytics is unavailable.', 503);
  try {
    const article = await db.prepare("SELECT id FROM articles WHERE id = ? AND status = 'published' AND (published_at IS NULL OR datetime(published_at) <= CURRENT_TIMESTAMP) LIMIT 1").bind(articleId).first<{ id: string }>();
    if (!article) return jsonError('Article not found.', 404);
    await db.prepare('INSERT INTO article_views (id, article_id, viewed_on) VALUES (?, ?, date(\'now\'))').bind(randomUUID(), articleId).run();
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Analytics migration is required.', 503);
  }
}
