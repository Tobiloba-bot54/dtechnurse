// File: app/api/store/orders/[id]/actions/route.ts
// Shopper order actions: cancel, dispute, and product review.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { cancelOrder, fileDispute, submitReview } from '@/lib/services/store/orders';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const action = cleanText(body.action, 40);
  try {
    if (action === 'cancel') {
      const result = await cancelOrder(auth.user.id, id);
      if (!result.ok) return jsonError(result.error, 400);
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (action === 'dispute') {
      const disputeType = body.disputeType === 'exchange' ? 'exchange' : 'refund';
      const reason = cleanText(body.reason, 2000);
      if (reason.length < 10) return jsonError('Describe the issue in at least 10 characters.', 400);
      const result = await fileDispute(auth.user.id, id, { disputeType, reason });
      if (!result.ok) return jsonError(result.error, 400);
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (action === 'review') {
      const listingId = cleanText(body.listingId, 100);
      const rating = Number(body.rating);
      const title = cleanText(body.title, 120);
      const reviewBody = cleanText(body.body, 2000);
      if (!listingId) return jsonError('Choose the product you are reviewing.', 400);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return jsonError('Choose a rating between 1 and 5.', 400);
      const result = await submitReview(auth.user.id, id, { listingId, rating, title, body: reviewBody });
      if (!result.ok) return jsonError(result.error, 400);
      return Response.json({ ok: true, status: result.status }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return jsonError('Unknown order action.', 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The action could not be completed.', 503);
  }
}
