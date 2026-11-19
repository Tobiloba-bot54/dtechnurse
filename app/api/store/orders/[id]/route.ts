// File: app/api/store/orders/[id]/route.ts
// Order detail for the signed-in shopper.
import { requireUser } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getOrderDetail } from '@/lib/services/store/orders';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  try {
    const order = await getOrderDetail(auth.user.id, id);
    if (!order) return jsonError('Order not found.', 404);
    return Response.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The order could not be loaded.', 503);
  }
}
