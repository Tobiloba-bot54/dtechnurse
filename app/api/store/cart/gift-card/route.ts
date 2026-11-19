// File: app/api/store/cart/gift-card/route.ts
// Validate a gift card code without applying it to the cart.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { validateGiftCard } from '@/lib/services/store/cart';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const code = cleanText(body.code, 60);
  if (!code) return jsonError('Enter a gift card code.', 400);
  try {
    const result = await validateGiftCard(code);
    if (!result.ok) return jsonError(result.error, 400);
    return Response.json({ ok: true, balanceKobo: result.balanceKobo }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The gift card could not be checked.', 503);
  }
}
