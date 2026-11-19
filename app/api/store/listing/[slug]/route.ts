// File: app/api/store/listing/[slug]/route.ts
// Public product detail by slug.
import { getListingBySlug } from '@/lib/services/store/catalog';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  try {
    const listing = await getListingBySlug(slug);
    if (!listing) return jsonError('Product not found.', 404);
    return Response.json({ listing }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return jsonError('Product could not be loaded right now.', 503);
  }
}
