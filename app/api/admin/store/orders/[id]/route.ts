// File: app/api/admin/store/orders/[id]/route.ts
// Staff order detail and status updates, plus admin-only refund recording.
import { requireStoreAdmin, requireStoreStaff } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { adminUpdateOrderStatus, getOrderForAdmin, recordRefund } from '@/lib/services/store/orders';
import { ORDER_STATUS_VALUES, type OrderStatus } from '@/lib/services/store/types';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const order = await getOrderForAdmin(id);
    if (!order) return jsonError('Order not found.', 404);
    return Response.json({ order: { ...order, buyerName: order.buyerDisplayName } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The order could not be loaded.', 503);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const status = cleanText(body.status, 40);
  if (!(ORDER_STATUS_VALUES as readonly string[]).includes(status)) return jsonError('Unknown order status.', 400);
  const note = cleanText(body.note, 500);
  try {
    const result = await adminUpdateOrderStatus(id, status as OrderStatus, note, auth.user.id);
    if (!result.ok) return jsonError(result.error, 400);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The order could not be updated.', 503);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  if (body.action !== 'refund') return jsonError('Unknown order action.', 400);
  const amountKobo = Number(body.amountKobo);
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) return jsonError('Refund amount must be greater than zero.', 400);
  const provider = body.provider === 'paystack' ? 'paystack' : body.provider === 'flutterwave' ? 'flutterwave' : body.provider === 'other' ? 'other' : '';
  if (!provider) return jsonError('The refund provider must be paystack, flutterwave, or other.', 400);
  const reference = cleanText(body.reference, 200);
  const note = cleanText(body.note, 1000);
  const disputeId = cleanText(body.disputeId, 100) || undefined;
  try {
    const result = await recordRefund(id, { amountKobo, provider, reference, note, disputeId }, auth.user.id);
    if (!result.ok) return jsonError(result.error, 400);
    return Response.json({ ok: true, refundedTotalKobo: result.refundedTotalKobo }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The refund could not be recorded.', 503);
  }
}
