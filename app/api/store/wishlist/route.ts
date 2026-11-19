// File: app/api/store/wishlist/route.ts
// Wishlist read and toggle for the signed-in shopper.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { getWishlist, toggleWishlist } from '@/lib/services/store/engagement';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const items = await getWishlist(auth.user.id);
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your wishlist could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const listingId = cleanText(body.listingId, 100);
  if (!listingId) return jsonError('Choose a product for your wishlist.', 400);
  try {
    const result = await toggleWishlist(auth.user.id, listingId);
    return Response.json({ added: result.added }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your wishlist could not be updated.', 400);
  }
}
