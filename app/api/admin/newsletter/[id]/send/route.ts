import { getDatabase } from '@/lib/server/db';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getResendSettings, sendViaResend } from '@/lib/services/resend';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const { id } = await context.params;

  const campaign = await db.prepare('SELECT * FROM newsletter_campaigns WHERE id = ?').bind(id).first<{ id: string; subject: string; body_html: string; status: string }>();
  if (!campaign) return jsonError('Campaign not found.', 404);
  if (campaign.status === 'sending' || campaign.status === 'sent') return jsonError('This campaign has already been sent.', 409);

  const resendSettings = await getResendSettings();
  if (!resendSettings.apiKey) return jsonError('Add a Resend API key in Admin → Newsletter settings before sending.', 400);
  if (!resendSettings.fromEmail) return jsonError('Add a "from" email address in Admin → Newsletter settings before sending.', 400);

  const subscribers = await db.prepare("SELECT id, email, unsubscribe_token FROM newsletter_subscribers WHERE status = 'subscribed'").all<{ id: string; email: string; unsubscribe_token: string | null }>();
  const recipients = subscribers.results ?? [];
  if (recipients.length === 0) return jsonError('There are no subscribed emails to send to yet.', 400);

  await db.prepare("UPDATE newsletter_campaigns SET status = 'sending', recipient_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(recipients.length, id).run();

  const from = `${resendSettings.fromName} <${resendSettings.fromEmail}>`;
  let sent = 0;
  let failed = 0;
  for (const subscriber of recipients) {
    let token = subscriber.unsubscribe_token;
    if (!token) { token = crypto.randomUUID(); await db.prepare('UPDATE newsletter_subscribers SET unsubscribe_token = ? WHERE id = ?').bind(token, subscriber.id).run(); }
    const baseUrl = (process.env.APP_BASE_URL || 'https://dtechnurse.com').replace(/\/$/, '');
    const unsubscribeUrl = `${baseUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
    const emailHtml = `${campaign.body_html}<hr><p style="font-size:12px;color:#526173">You are receiving this email because you subscribed to DTECHNURSE updates. <a href="${unsubscribeUrl}">Unsubscribe</a>.</p>`;
    const result = await sendViaResend({ apiKey: resendSettings.apiKey, from, to: subscriber.email, subject: campaign.subject, html: emailHtml });
    if (result.ok) sent += 1; else failed += 1;
  }

  const finalStatus = failed === 0 ? 'sent' : (sent === 0 ? 'failed' : 'sent');
  await db
    .prepare("UPDATE newsletter_campaigns SET status = ?, sent_count = ?, failed_count = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(finalStatus, sent, failed, id)
    .run();

  return Response.json({ ok: true, sent, failed, total: recipients.length }, { headers: { 'Cache-Control': 'no-store' } });
}
