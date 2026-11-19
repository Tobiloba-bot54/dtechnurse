// File: app/api/store/catalog/route.ts
// Public storefront catalog browsing with pagination, search, and category filters.
import * as catalog from '@/lib/services/store/catalog';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categorySlug = (url.searchParams.get('category') ?? '').trim();
  const q = (url.searchParams.get('q') ?? '').trim();
  const sortParam = url.searchParams.get('sort') ?? 'newest';
  const sort = sortParam === 'price_asc' || sortParam === 'price_desc' ? sortParam : 'newest';
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
  const limitRaw = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(50, Math.floor(limitRaw)) : undefined;
  const featuredOnly = ['1', 'true'].includes((url.searchParams.get('featured') ?? '').toLowerCase());
  try {
    const categories = await catalog.listActiveCategories();
    if (categorySlug) {
      const category = await catalog.getCategoryBySlug(categorySlug);
      if (!category || !category.isActive) {
        return Response.json({ listings: [], total: 0, page: 1, pages: 1, categories, attributes: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
      }
      const [result, attributes] = await Promise.all([
        catalog.browseListings({ categorySlug, q, sort, page, perPage: limit, featuredOnly }),
        catalog.listCategoryAttributes(category.id, false),
      ]);
      return Response.json({ listings: result.listings, total: result.total, page: result.page, pages: result.pages, categories, attributes }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }
    const result = await catalog.browseListings({ q, sort, page, perPage: limit, featuredOnly });
    return Response.json({ listings: result.listings, total: result.total, page: result.page, pages: result.pages, categories }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return jsonError('Products could not be loaded right now.', 503);
  }
}
