import { getDatabase } from '@/lib/server/db';
import { jsonError } from '@/lib/server/validation';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('Invalid unsubscribe request.', 400); }
  const token = body && typeof body === 'object' && typeof (body as Record<string, unknown>).token === 'string' ? String((body as Record<string, unknown>).token).slice(0, 100) : '';
  if (!token) return jsonError('Unsubscribe link is missing its token.', 400);
  const db = getDatabase();
  if (!db) return jsonError('Newsletter service is unavailable.', 503);
  try {
    const result = await db.prepare("UPDATE newsletter_subscribers SET status = 'unsubscribed' WHERE unsubscribe_token = ?").bind(token).run();
    return Response.json({ ok: true, message: 'If this link was valid, the subscription has been stopped.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return jsonError('Could not process this unsubscribe request.', 503); }
}
