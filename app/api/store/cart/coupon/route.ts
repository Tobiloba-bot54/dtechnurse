// File: app/api/store/cart/coupon/route.ts
// Apply or remove a coupon on the active cart.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { applyCoupon, removeCoupon } from '@/lib/services/store/cart';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const code = cleanText(body.code, 60).toUpperCase();
  if (!code) return jsonError('Enter a coupon code.', 400);
  try {
    const result = await applyCoupon(auth.user.id, code);
    if (!result.ok) return jsonError(result.error, 400);
    return Response.json({ ok: true, discountKobo: result.discountKobo }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The coupon could not be applied.', 503);
  }
}

export async function DELETE() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    await removeCoupon(auth.user.id);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The coupon could not be removed.', 503);
  }
}
