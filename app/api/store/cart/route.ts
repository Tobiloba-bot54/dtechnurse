// File: app/api/store/cart/route.ts
// Signed-in shopper cart: read, add, update quantity, remove, and clear.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { addToCart, clearCart, getCartState, removeFromCart, updateCartItem } from '@/lib/services/store/cart';
import { getPaymentGatewayConfig } from '@/lib/services/store/settings';

export const runtime = 'nodejs';

async function enabledPaymentProviders(): Promise<string[]> {
  const providers: string[] = [];
  const paystack = await getPaymentGatewayConfig('paystack');
  if (paystack.enabled && (paystack.secretKey || paystack.publicKey)) providers.push('paystack');
  const flutterwave = await getPaymentGatewayConfig('flutterwave');
  if (flutterwave.enabled && (flutterwave.secretKey || flutterwave.publicKey)) providers.push('flutterwave');
  return providers;
}

function parseSelectedAttributes(input: unknown): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return attributes;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key.trim() && typeof value === 'string' && value.trim()) attributes[key.trim()] = value.trim();
  }
  return attributes;
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const cart = await getCartState(auth.user.id);
    return Response.json({ cart, paymentProviders: await enabledPaymentProviders() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your cart could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const listingId = cleanText(body.listingId, 100);
  const quantity = Number(body.quantity);
  if (!listingId) return jsonError('Choose a product to add.', 400);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return jsonError('Quantity must be between 1 and 999.', 400);
  try {
    const cart = await addToCart(auth.user.id, { listingId, quantity, selectedAttributes: parseSelectedAttributes(body.selectedAttributes) });
    return Response.json({ cart }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The product could not be added to your cart.', 400);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const itemId = cleanText(body.itemId, 100);
  const quantity = Number(body.quantity);
  if (!itemId) return jsonError('A cart item is required.', 400);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) return jsonError('Quantity must be between 0 and 999.', 400);
  try {
    const cart = await updateCartItem(auth.user.id, itemId, quantity);
    return Response.json({ cart }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The cart could not be updated.', 400);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const itemId = cleanText(url.searchParams.get('itemId'), 100);
  const clear = url.searchParams.get('clear') === '1';
  if (!clear && !itemId) return jsonError('A cart item is required.', 400);
  try {
    const cart = clear ? await clearCart(auth.user.id) : await removeFromCart(auth.user.id, itemId);
    return Response.json({ cart }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The cart could not be updated.', 400);
  }
}
