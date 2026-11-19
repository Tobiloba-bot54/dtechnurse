// File: app/api/admin/store/listings/route.ts
// Staff listing management: browse and create products and bundles.
import { requireStoreStaff } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import * as catalog from '@/lib/services/store/catalog';
import type { ListingInput } from '@/lib/services/store/catalog';

export const runtime = 'nodejs';

// Media URLs pasted from the library are converted back to bare object keys.
function normalizeObjectKey(raw: string): string {
  const key = raw.trim();
  if (!/^https?:\/\//i.test(key)) return key;
  const marker = '/uploads/';
  const index = key.indexOf(marker);
  return index >= 0 ? key.slice(index + 1) : key;
}

function parseListingInput(body: Record<string, unknown>): { input: ListingInput } | { error: string } {
  const title = cleanText(body.title, 200);
  if (!title) return { error: 'A product title is required.' };
  const listingType = body.listingType === 'single' ? 'single' : body.listingType === 'bundle' ? 'bundle' : '';
  if (!listingType) return { error: 'The product type must be single or bundle.' };
  const status = body.status === 'published' ? 'published' : body.status === 'archived' ? 'archived' : body.status === 'draft' ? 'draft' : '';
  if (!status) return { error: 'The status must be draft, published, or archived.' };
  const priceKobo = Number(body.priceKobo);
  if (!Number.isInteger(priceKobo) || priceKobo < 0) return { error: 'The price must be a whole amount of zero or more.' };
  const stockQuantity = Number(body.stockQuantity);
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return { error: 'Stock must be a whole number of zero or more.' };
  const compareRaw = body.compareAtPriceKobo;
  const compareAtPriceKobo = compareRaw === null || compareRaw === undefined || compareRaw === '' ? null : Number(compareRaw);
  if (compareAtPriceKobo !== null && (!Number.isInteger(compareAtPriceKobo) || compareAtPriceKobo < 0)) return { error: 'The compare-at price must be a whole amount of zero or more.' };
  const lowStockRaw = Number(body.lowStockThreshold);
  const lowStockThreshold = Number.isInteger(lowStockRaw) && lowStockRaw >= 0 ? lowStockRaw : 0;
  const downloadLimitRaw = Number(body.digitalDownloadLimit);
  const digitalDownloadLimit = Number.isInteger(downloadLimitRaw) && downloadLimitRaw >= 0 ? downloadLimitRaw : 5;
  const images = (Array.isArray(body.images) ? body.images : [])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => {
      const sortOrder = Number(item.sortOrder);
      return {
        objectKey: normalizeObjectKey(typeof item.objectKey === 'string' ? item.objectKey : ''),
        alt: cleanText(item.alt, 300),
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
        isPrimary: item.isPrimary === true,
      };
    })
    .filter(image => image.objectKey);
  const attributeOptions = (Array.isArray(body.attributeOptions) ? body.attributeOptions : [])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({ attributeId: cleanText(item.attributeId, 100), valueId: cleanText(item.valueId, 100) }))
    .filter(option => option.attributeId && option.valueId);
  const bundleItems: ListingInput['bundleItems'] = [];
  for (const item of (Array.isArray(body.bundleItems) ? body.bundleItems : []).filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')) {
    const productId = cleanText(item.productId, 100);
    if (!productId) continue;
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return { error: 'Each bundle product needs a quantity of at least 1.' };
    bundleItems.push({
      productId,
      quantity,
      attributeValueIds: Array.isArray(item.attributeValueIds)
        ? item.attributeValueIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim())
        : [],
    });
  }
  if (listingType === 'bundle' && bundleItems.length === 0) return { error: 'A bundle must include at least one product.' };
  const relatedIds = (Array.isArray(body.relatedIds) ? body.relatedIds : [])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim())
    .filter(value => value.length > 0);
  return {
    input: {
      listingType,
      title,
      description: typeof body.description === 'string' ? body.description.slice(0, 20000) : '',
      categoryId: cleanText(body.categoryId, 100) || null,
      priceKobo,
      compareAtPriceKobo,
      status,
      isFeatured: body.isFeatured === true,
      isFreeShipping: body.isFreeShipping === true,
      trackStock: body.trackStock === true,
      stockQuantity,
      lowStockThreshold,
      isDigital: body.isDigital === true,
      digitalFileKey: normalizeObjectKey(cleanText(body.digitalFileKey, 500)) || null,
      digitalDownloadLimit,
      images,
      attributeOptions,
      bundleItems,
      relatedIds,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const status = cleanText(url.searchParams.get('status'), 40);
  const q = (url.searchParams.get('q') ?? '').trim();
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
  try {
    const result = await catalog.adminListListings({ status: status || undefined, q, page, perPage: 20 });
    return Response.json({ listings: result.listings, total: result.total, page: result.page, pages: result.pages }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Products could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const parsed = parseListingInput(body);
  if ('error' in parsed) return jsonError(parsed.error, 400);
  try {
    const created = await catalog.createListing(parsed.input, auth.user.id);
    return Response.json({ id: created.id, slug: created.slug }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The product could not be saved.', 400);
  }
}
