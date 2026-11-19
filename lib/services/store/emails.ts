import { getEmailServiceConfig } from './settings';
import { formatNaira } from './types';

export type StoreEmailResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function sendStoreEmail(to: string, subject: string, lines: string[]): Promise<StoreEmailResult> {
  try {
    const config = await getEmailServiceConfig();
    if (!config.enabled || !config.apiKey || config.mode !== 'live') return { ok: true, skipped: true };
    const fromName = config.fromName || 'DTECHNURSE STORE';
    const fromEmail = config.fromEmail || 'onboarding@resend.dev';
    const from = `"${fromName}" <${fromEmail}>`;
    const html = lines.filter(line => line.trim()).map(line => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`).join('');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Resend store email failed with status ${response.status}: ${body.slice(0, 300)}`);
      return { ok: false, error: `Resend returned ${response.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (error) {
    console.error('Store email failed.', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Network error sending email.' };
  }
}

export type OrderEmailPayload = {
  id: string;
  orderNumber: string;
  status: string;
  totalKobo: number;
  items: Array<{ title: string; quantity: number }>;
  userEmail: string;
  userDisplayName?: string;
};

// Fire-and-forget order status emails. Never throws so order flows are not blocked by email failures.
export async function sendOrderEmails(order: OrderEmailPayload): Promise<void> {
  try {
    if (!order.userEmail) return;
    const greetingName = order.userDisplayName?.trim() || 'there';
    const itemLines = order.items.map(item => `${item.quantity} x ${item.title}`);
    const totalLine = `Order total: ${formatNaira(order.totalKobo)}`;
    const footer = 'DTECHNURSE STORE';
    if (order.status === 'paid') {
      await sendStoreEmail(order.userEmail, `Your DTECHNURSE STORE order ${order.orderNumber} is confirmed`, [
        `Hi ${greetingName},`,
        `Your order ${order.orderNumber} is confirmed.`,
        ...itemLines,
        totalLine,
        'Thank you for shopping with us.',
        footer,
      ]);
    } else if (order.status === 'shipped') {
      await sendStoreEmail(order.userEmail, `Your order ${order.orderNumber} has been shipped`, [
        `Hi ${greetingName},`,
        `Your order ${order.orderNumber} has been shipped and is on its way.`,
        ...itemLines,
        totalLine,
        footer,
      ]);
    } else if (order.status === 'refunded') {
      await sendStoreEmail(order.userEmail, `Refund recorded for order ${order.orderNumber}`, [
        `Hi ${greetingName},`,
        `A refund has been recorded for order ${order.orderNumber}.`,
        ...itemLines,
        totalLine,
        footer,
      ]);
    }
  } catch (error) {
    console.error('Order email failed.', error);
  }
}
