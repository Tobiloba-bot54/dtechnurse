// File: app/api/store/orders/route.ts
// Order history for the signed-in shopper.
import { requireUser } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { listUserOrders } from '@/lib/services/store/orders';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const orders = await listUserOrders(auth.user.id);
    return Response.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your orders could not be loaded.', 503);
  }
}
