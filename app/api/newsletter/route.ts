// File: DTECHNURSE-SITE-main/app/api/newsletter/route.ts
import { getDatabase } from '@/lib/server/db';
import { cleanText, jsonError, validEmail } from '@/lib/server/validation';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('Please submit a valid form.', 400); }
  const data = (body && typeof body === 'object') ? body as Record<string, unknown> : {};
  const email = cleanText(data.email, 254).toLowerCase();
  // Honeypot field used to reject basic automated submissions.
  if (cleanText(data.website, 200)) return Response.json({ ok: true });
  if (!validEmail(email)) return jsonError('Enter a valid email address.', 400);

  const db = getDatabase();
  if (!db) return jsonError('The newsletter service is temporarily unavailable. Please try again later.', 503);
  try {
    const existing = await db.prepare('SELECT id, status, unsubscribe_token FROM newsletter_subscribers WHERE email = ? LIMIT 1').bind(email).first<{ id: string; status: string; unsubscribe_token: string | null }>();
    if (existing) {
      if (existing.status !== 'subscribed') {
        await db.prepare("UPDATE newsletter_subscribers SET status = 'subscribed', unsubscribe_token = COALESCE(unsubscribe_token, ?) WHERE id = ?").bind(crypto.randomUUID(), existing.id).run();
      }
      return Response.json({ ok: true, message: "You're already on the list." }, { headers: { 'Cache-Control': 'no-store' } });
    }
    await db.prepare('INSERT INTO newsletter_subscribers (id, email, unsubscribe_token) VALUES (?, ?, ?)').bind(crypto.randomUUID(), email, crypto.randomUUID()).run();
    return Response.json({ ok: true, message: 'Thanks for subscribing! You are now subscribed. You can unsubscribe at any time from a newsletter email.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('We could not save your subscription. Please try again later.', 503);
  }
}
