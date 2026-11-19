// File: app/api/store/checkout/verify/route.ts
// Verify payment for a pending order and finalize it.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { getOrderDetail, verifyAndFinalizeOrder } from '@/lib/services/store/orders';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const orderId = cleanText(body.orderId, 100);
  if (!orderId) return jsonError('An order id is required.', 400);
  try {
    const order = await getOrderDetail(auth.user.id, orderId);
    if (!order) return jsonError('Order not found.', 404);
    const result = await verifyAndFinalizeOrder(orderId);
    return Response.json({ status: result.status, orderNumber: order.orderNumber }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Payment could not be verified.', 400);
  }
}
