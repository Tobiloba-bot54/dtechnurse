// File: DTECHNURSE-SITE-main/app/api/contact/route.ts
import { getDatabase } from '@/lib/server/db';
import { cleanText, jsonError, validEmail } from '@/lib/server/validation';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError('Please submit a valid form.', 400); }
  const data = (body && typeof body === 'object') ? body as Record<string, unknown> : {};
  const name = cleanText(data.name, 100);
  const email = cleanText(data.email, 254).toLowerCase();
  const subject = cleanText(data.subject, 160);
  const message = cleanText(data.message, 5000);
  // Honeypot field used to reject basic automated submissions.
  if (cleanText(data.website, 200)) return Response.json({ ok: true });
  if (name.length < 2 || !validEmail(email) || message.length < 10) return jsonError('Enter your name, a valid email address, and a message of at least 10 characters.', 400);
  const db = getDatabase();
  if (!db) return jsonError('The contact service is temporarily unavailable. Please try again later.', 503);
  try {
    await db.prepare('INSERT INTO contact_submissions (id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), name, email, subject, message).run();
    return Response.json({ ok: true, message: 'Your message has been received.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('We could not save your message. Please try again later.', 503);
  }
}
