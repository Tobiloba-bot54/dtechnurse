import { requireUser } from '@/lib/server/supabase-auth';
import { confirmResourcePurchase, getResourcePurchaseForVerification, markResourcePurchaseFailed } from '@/lib/services/resources';
import { verifyTransaction } from '@/lib/services/paystack';
import { jsonError } from '@/lib/server/validation';
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser(); if (!auth.ok) return auth.response;
  let body: { reference?: string }; try { body = await request.json(); } catch { return jsonError('Missing transaction reference.', 400); }
  const reference = typeof body.reference === 'string' ? body.reference.slice(0, 150) : '';
  if (!reference) return jsonError('Missing transaction reference.', 400);
  const { slug } = await context.params;
  let purchase;
  try { purchase = await getResourcePurchaseForVerification(reference, auth.user.id, slug); }
  catch { return jsonError('Database is not configured.', 503); }
  if (!purchase) return jsonError('Purchase could not be found for this account.', 404);
  const newlyConfirmed = purchase.status !== 'confirmed';
  if (newlyConfirmed) {
    let transaction; try { transaction = await verifyTransaction(reference); } catch (error) { return jsonError(error instanceof Error ? error.message : 'Payment verification failed.', 503); }
    if (transaction.status !== 'success' || transaction.reference !== reference || transaction.amount !== purchase.amount_kobo || transaction.currency !== 'NGN' || (auth.user.email && transaction.email.toLowerCase() !== auth.user.email.toLowerCase())) {
      await markResourcePurchaseFailed(purchase.id).catch(() => {});
      return jsonError('Payment could not be verified. No download access was granted.', 402);
    }
    try { await confirmResourcePurchase(purchase.id); }
    catch { return jsonError('Payment was verified, but access could not be saved. Please contact support before paying again.', 503); }
  }
  return Response.json({ verified: true, downloadUrl: `/api/resources/${encodeURIComponent(slug)}/download` }, { headers: { 'Cache-Control': 'no-store' } });
}
