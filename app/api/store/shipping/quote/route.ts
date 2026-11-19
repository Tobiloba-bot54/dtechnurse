// File: app/api/store/shipping/quote/route.ts
// Shipping quote for the active cart and a chosen state.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { quoteShipping } from '@/lib/services/store/shipping';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const state = cleanText(body.state, 120);
  if (!state) return jsonError('Choose a delivery state.', 400);
  try {
    const quote = await quoteShipping(auth.user.id, state);
    return Response.json({ quote }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'A shipping quote could not be calculated.', 503);
  }
}
