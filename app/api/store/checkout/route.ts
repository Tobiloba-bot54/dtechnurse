// File: app/api/store/checkout/route.ts
// Turn the active cart into an order and initialize payment.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { createOrderFromCart } from '@/lib/services/store/orders';
import { getPaymentGatewayConfig } from '@/lib/services/store/settings';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!auth.user.email) return jsonError('A verified email is required to check out.', 400);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const fullName = cleanText(body.fullName, 180);
  const phone = cleanText(body.phone, 40);
  const street = cleanText(body.street, 300);
  const city = cleanText(body.city, 120);
  const localGovernment = cleanText(body.localGovernment, 120);
  const state = cleanText(body.state, 120);
  const provider = body.provider === 'paystack' ? 'paystack' : body.provider === 'flutterwave' ? 'flutterwave' : '';
  if (!fullName || !phone || !street || !city || !state) return jsonError('Full name, phone, street, city, and state are required.', 400);
  if (!provider) return jsonError('Choose a payment method.', 400);
  const gateway = await getPaymentGatewayConfig(provider);
  if (!gateway.enabled || !(gateway.secretKey || gateway.publicKey)) {
    return jsonError(provider === 'paystack' ? 'Paystack is not available right now.' : 'Flutterwave is not available right now.', 400);
  }
  const giftCardCode = cleanText(body.giftCardCode, 60) || undefined;
  try {
    const order = await createOrderFromCart(auth.user.id, auth.user.email, {
      fullName,
      phone,
      street,
      city,
      localGovernment,
      state,
      provider,
      giftCardCode,
      origin: new URL(request.url).origin,
    });
    return Response.json({ orderId: order.orderId, orderNumber: order.orderNumber, amountDueKobo: order.amountDueKobo, paymentUrl: order.paymentUrl }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Your order could not be placed.';
    return jsonError(message, message.includes('not configured') ? 503 : 400);
  }
}
