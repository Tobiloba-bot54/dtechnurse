import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const result = await db
    .prepare('SELECT id, subject, article_id, status, recipient_count, sent_count, failed_count, sent_at, created_at FROM newsletter_campaigns ORDER BY created_at DESC LIMIT 100')
    .all();
  const subscriberCount = await db.prepare("SELECT COUNT(*) AS c FROM newsletter_subscribers WHERE status = 'subscribed'").first<{ c: number }>();
  return Response.json({ campaigns: result.results, subscriberCount: subscriberCount?.c ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const subject = cleanText(body.subject, 200);
  const bodyHtml = typeof body.bodyHtml === 'string' ? body.bodyHtml.slice(0, 200000) : '';
  const articleId = cleanText(body.articleId, 100) || null;
  if (!subject) return jsonError('Subject is required.', 400);
  if (!bodyHtml.trim()) return jsonError('Email content is required.', 400);
  const id = randomUUID();
  try {
    await db
      .prepare('INSERT INTO newsletter_campaigns (id, subject, body_html, article_id, created_by) VALUES (?, ?, ?, ?, ?)')
      .bind(id, subject, bodyHtml, articleId, auth.user.id)
      .run();
    return Response.json({ id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save the newsletter draft.', 409);
  }
}
