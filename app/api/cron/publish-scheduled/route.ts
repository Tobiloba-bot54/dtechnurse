// File: app/api/cron/publish-scheduled/route.ts
import { getDatabase } from '@/lib/server/db';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const db = getDatabase();
  if (!db) return Response.json({ error: 'Database is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    const result = await db.prepare("UPDATE articles SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE status = 'scheduled' AND published_at IS NOT NULL AND datetime(published_at) <= CURRENT_TIMESTAMP").run() as { meta?: { changes?: number } };
    return Response.json({ ok: true, published: result.meta?.changes ?? 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Scheduled publishing could not run.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
