import { requireUser } from '@/lib/server/supabase-auth';
import { failResourcePurchase, prepareResourcePurchase } from '@/lib/services/resources';
import { initializeTransaction } from '@/lib/services/paystack';
import { jsonError } from '@/lib/server/validation';
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser(); if (!auth.ok) return auth.response;
  const { slug } = await context.params;
  let purchase;
  try { purchase = await prepareResourcePurchase(slug, auth.user.id); }
  catch { return jsonError('Database is not configured or the purchase could not be created.', 503); }
  if (purchase.kind === 'not-found') return jsonError('Resource not found.', 404);
  if (purchase.kind === 'not-paid') return jsonError('This resource is not available for paid checkout.', 400);
  if (purchase.kind === 'already-purchased') return Response.json({ alreadyPurchased: true, downloadUrl: `/api/resources/${encodeURIComponent(slug)}/download` });
  if (!auth.user.email) {
    await failResourcePurchase(purchase.reference).catch(() => {});
    return jsonError('Your account has no email on file. Please update your profile before checking out.', 400);
  }
  try {
    const origin = new URL(request.url).origin;
    const checkout = await initializeTransaction({ email: auth.user.email, amountKobo: purchase.priceKobo, reference: purchase.reference, callbackUrl: `${origin}/resources/purchase-success?resource=${encodeURIComponent(slug)}`, metadata: { resourceId: purchase.resourceId, userId: auth.user.id, resourceSlug: slug } });
    return Response.json({ authorizationUrl: checkout.authorizationUrl, reference: checkout.reference }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    await failResourcePurchase(purchase.reference).catch(() => {});
    return jsonError(error instanceof Error ? error.message : 'Checkout could not be started.', 503);
  }
}
