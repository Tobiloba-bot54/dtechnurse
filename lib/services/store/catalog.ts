import { cache } from 'react';

import { getDatabase, type SqlDatabase } from '@/lib/server/db';
import { getPublicMediaBase } from '@/lib/server/storage';
import { getStoreSettings } from './settings';
import type { BundleComponent, CategoryAttribute, CategorySummary, DealInfo, ListingAttributeChoice, ListingDetail, ListingSummary } from './types';

const LOGO_FALLBACK = '/dtechnurse-logo.jpg';

export function listingImageUrl(objectKey: string | null | undefined): string {
  if (typeof objectKey !== 'string' || !objectKey.trim()) return LOGO_FALLBACK;
  const base = getPublicMediaBase();
  if (!base) return LOGO_FALLBACK;
  return `${base.replace(/\/$/, '')}/${objectKey.replace(/^\//, '')}`;
}

export type ListingBaseRow = {
  id: string;
  slug: string;
  title: string;
  price_kobo: number;
  compare_at_price_kobo: number | null;
  currency: string;
  listing_type: string;
  is_free_shipping: number;
  track_stock: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_digital: number;
  is_featured: number;
  category_name: string | null;
  category_slug: string | null;
};

const LISTING_SUMMARY_FIELDS = 'l.id, l.slug, l.title, l.price_kobo, l.compare_at_price_kobo, l.currency, l.listing_type, l.is_free_shipping, l.track_stock, l.stock_quantity, l.low_stock_threshold, l.is_digital, l.is_featured, c.name AS category_name, c.slug AS category_slug';
const LISTING_FROM = 'FROM listings l LEFT JOIN store_categories c ON c.id = l.category_id';

export { LISTING_SUMMARY_FIELDS, LISTING_FROM };

type DealRow = { listing_id: string; discount_type: string; discount_value: number; ends_at: string | null };

function buildDeal(priceKobo: number, discountType: string, discountValue: number, endsAt: string | null): DealInfo {
  const type = discountType === 'fixed' ? 'fixed' : 'percentage';
  const value = Math.max(0, Math.floor(discountValue));
  const priceKoboSafe = Math.max(0, Math.floor(priceKobo));
  const price = type === 'percentage' ? Math.floor((priceKoboSafe * (100 - Math.min(value, 100))) / 100) : Math.max(priceKoboSafe - value, 0);
  return { discountType: type, discountValue: value, priceKobo: price, endsAt };
}

function toSummary(row: ListingBaseRow, imageUrl: string, ratingAverage: number, ratingCount: number, activeDeal: DealInfo | null): ListingSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    priceKobo: Number(row.price_kobo),
    compareAtPriceKobo: row.compare_at_price_kobo === null || row.compare_at_price_kobo === undefined ? null : Number(row.compare_at_price_kobo),
    currency: row.currency,
    listingType: row.listing_type === 'bundle' ? 'bundle' : 'single',
    isFreeShipping: row.is_free_shipping === 1,
    trackStock: row.track_stock === 1,
    stockQuantity: Number(row.stock_quantity),
    lowStockThreshold: Number(row.low_stock_threshold),
    isDigital: row.is_digital === 1,
    isFeatured: row.is_featured === 1,
    primaryImageUrl: imageUrl,
    ratingAverage,
    ratingCount,
    activeDeal,
    categoryName: row.category_name ?? '',
    categorySlug: row.category_slug ?? '',
  };
}

// Attaches the primary image, approved-review rating, and the best active deal to raw listing rows.
export async function hydrateListingSummaries(rows: ListingBaseRow[]): Promise<ListingSummary[]> {
  if (!rows.length) return [];
  const db = getDatabase();
  if (!db) return rows.map(row => toSummary(row, LOGO_FALLBACK, 0, 0, null));
  const ids = rows.map(row => row.id);
  const placeholders = ids.map(() => '?').join(', ');
  const now = new Date().toISOString();
  const imageRows = await db.prepare(`SELECT listing_id, object_key FROM listing_images WHERE listing_id IN (${placeholders}) ORDER BY is_primary DESC, sort_order ASC, created_at ASC`).bind(...ids).all<{ listing_id: string; object_key: string }>();
  const imageMap = new Map<string, string>();
  for (const image of imageRows.results ?? []) if (!imageMap.has(image.listing_id)) imageMap.set(image.listing_id, image.object_key);
  const ratingRows = await db.prepare(`SELECT listing_id, AVG(rating) AS rating_average, COUNT(*) AS rating_count FROM reviews WHERE status = 'approved' AND listing_id IN (${placeholders}) GROUP BY listing_id`).bind(...ids).all<{ listing_id: string; rating_average: number | null; rating_count: number }>();
  const ratingMap = new Map<string, { average: number; count: number }>();
  for (const rating of ratingRows.results ?? []) ratingMap.set(rating.listing_id, { average: Math.round(Number(rating.rating_average ?? 0) * 10) / 10, count: Number(rating.rating_count ?? 0) });
  const flashRows = await db.prepare(`SELECT listing_id, discount_type, discount_value, ends_at FROM flash_deals WHERE is_active = 1 AND starts_at <= ? AND ends_at > ? AND listing_id IN (${placeholders}) ORDER BY created_at DESC`).bind(now, now, ...ids).all<DealRow>();
  const flashMap = new Map<string, DealRow>();
  for (const deal of flashRows.results ?? []) if (!flashMap.has(deal.listing_id)) flashMap.set(deal.listing_id, deal);
  const discountRows = await db.prepare(`SELECT listing_id, discount_type, discount_value, ends_at FROM listing_discounts WHERE is_active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?) AND listing_id IN (${placeholders}) ORDER BY created_at DESC`).bind(now, now, ...ids).all<DealRow>();
  const discountMap = new Map<string, DealRow>();
  for (const deal of discountRows.results ?? []) if (!discountMap.has(deal.listing_id)) discountMap.set(deal.listing_id, deal);
  return rows.map(row => {
    const priceKobo = Number(row.price_kobo);
    const flash = flashMap.get(row.id) ?? null;
    const dealRow = flash ?? discountMap.get(row.id) ?? null;
    const rating = ratingMap.get(row.id);
    return toSummary(row, listingImageUrl(imageMap.get(row.id) ?? null), rating?.average ?? 0, rating?.count ?? 0, dealRow ? buildDeal(priceKobo, dealRow.discount_type, Number(dealRow.discount_value), dealRow.ends_at) : null);
  });
}

function mapCategory(row: { id: string; name: string; slug: string; description: string; is_active: number; sort_order: number }): CategorySummary {
  return { id: row.id, name: row.name, slug: row.slug, description: row.description, isActive: row.is_active === 1, sortOrder: Number(row.sort_order) };
}

export const listActiveCategories = cache(async (): Promise<CategorySummary[]> => {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.prepare('SELECT id, name, slug, description, is_active, sort_order FROM store_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC').all<{ id: string; name: string; slug: string; description: string; is_active: number; sort_order: number }>();
  return (rows.results ?? []).map(mapCategory);
});

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | null> {
  const db = getDatabase();
  if (!db) return null;
  const row = await db.prepare('SELECT id, name, slug, description, is_active, sort_order FROM store_categories WHERE slug = ? LIMIT 1').bind(slug).first<{ id: string; name: string; slug: string; description: string; is_active: number; sort_order: number }>();
  return row ? mapCategory(row) : null;
}

export async function listCategoryAttributes(categoryId: string, includeInactive = false): Promise<CategoryAttribute[]> {
  const db = getDatabase();
  if (!db) return [];
  const attributeRows = await db
    .prepare(`SELECT id, category_id, name, slug, input_type, is_required, is_active, sort_order FROM category_attributes WHERE category_id = ?${includeInactive ? '' : ' AND is_active = 1'} ORDER BY sort_order ASC, name ASC`)
    .bind(categoryId)
    .all<{ id: string; category_id: string; name: string; slug: string; input_type: string; is_required: number; is_active: number; sort_order: number }>();
  const attributes = attributeRows.results ?? [];
  if (!attributes.length) return [];
  const ids = attributes.map(attribute => attribute.id);
  const valueRows = await db
    .prepare(`SELECT id, attribute_id, value, label, swatch_color, sort_order FROM category_attribute_values WHERE attribute_id IN (${ids.map(() => '?').join(', ')}) ORDER BY sort_order ASC, value ASC`)
    .bind(...ids)
    .all<{ id: string; attribute_id: string; value: string; label: string; swatch_color: string | null; sort_order: number }>();
  const valuesByAttribute = new Map<string, Array<{ id: string; value: string; label: string; swatchColor: string | null; sortOrder: number }>>();
  for (const value of valueRows.results ?? []) {
    const list = valuesByAttribute.get(value.attribute_id) ?? [];
    list.push({ id: value.id, value: value.value, label: value.label || value.value, swatchColor: value.swatch_color, sortOrder: Number(value.sort_order) });
    valuesByAttribute.set(value.attribute_id, list);
  }
  return attributes.map(attribute => ({
    id: attribute.id,
    categoryId: attribute.category_id,
    name: attribute.name,
    slug: attribute.slug,
    inputType: attribute.input_type === 'text' ? 'text' : 'select',
    isRequired: attribute.is_required === 1,
    isActive: attribute.is_active === 1,
    sortOrder: Number(attribute.sort_order),
    values: valuesByAttribute.get(attribute.id) ?? [],
  }));
}

export type BrowseListingsResult = { listings: ListingSummary[]; total: number; page: number; pages: number };

export async function browseListings(opts: { categorySlug?: string; q?: string; sort?: 'newest' | 'price_asc' | 'price_desc'; page?: number; perPage?: number; featuredOnly?: boolean; limit?: number } = {}): Promise<BrowseListingsResult> {
  const db = getDatabase();
  if (!db) return { listings: [], total: 0, page: 1, pages: 1 };
  const settings = await getStoreSettings();
  const perPage = Math.min(50, Math.max(1, Math.floor(opts.limit ?? opts.perPage ?? settings.initialLoadCount)));
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where = ["l.status = 'published'"];
  const values: unknown[] = [];
  if (opts.categorySlug) { where.push('c.slug = ?'); values.push(opts.categorySlug); }
  if (opts.q && opts.q.trim()) {
    const like = `%${opts.q.trim().slice(0, 100)}%`;
    where.push('(lower(l.title) LIKE lower(?) OR lower(l.description) LIKE lower(?))');
    values.push(like, like);
  }
  if (opts.featuredOnly) where.push('l.is_featured = 1');
  const whereSql = where.join(' AND ');
  const order = opts.sort === 'price_asc'
    ? 'l.price_kobo ASC, COALESCE(l.published_at, l.created_at) DESC'
    : opts.sort === 'price_desc'
      ? 'l.price_kobo DESC, COALESCE(l.published_at, l.created_at) DESC'
      : 'COALESCE(l.published_at, l.created_at) DESC, l.created_at DESC';
  const totalRow = await db.prepare(`SELECT COUNT(*) AS total ${LISTING_FROM} WHERE ${whereSql}`).bind(...values).first<{ total: number }>();
  const total = Number(totalRow?.total ?? 0);
  const rows = await db.prepare(`SELECT ${LISTING_SUMMARY_FIELDS} ${LISTING_FROM} WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...values, perPage, (page - 1) * perPage).all<ListingBaseRow>();
  const listings = await hydrateListingSummaries(rows.results ?? []);
  return { listings, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

type AttributeJoinRow = { attribute_id: string; name: string; slug: string; is_required: number; value_id: string; value: string; label: string; swatch_color: string | null };

function groupAttributeRows(rows: AttributeJoinRow[]): ListingAttributeChoice[] {
  const order: string[] = [];
  const grouped = new Map<string, ListingAttributeChoice>();
  for (const row of rows) {
    let attribute = grouped.get(row.attribute_id);
    if (!attribute) {
      attribute = { attributeId: row.attribute_id, name: row.name, slug: row.slug, isRequired: row.is_required === 1, options: [] };
      grouped.set(row.attribute_id, attribute);
      order.push(row.attribute_id);
    }
    attribute.options.push({ valueId: row.value_id, value: row.value, label: row.label || row.value, swatchColor: row.swatch_color });
  }
  return order.map(id => grouped.get(id)!);
}

export async function getListingBySlug(slug: string, allowUnpublished = false): Promise<ListingDetail | null> {
  const db = getDatabase();
  if (!db) return null;
  const statusFilter = allowUnpublished ? '' : " AND l.status = 'published'";
  const row = await db
    .prepare(`SELECT ${LISTING_SUMMARY_FIELDS}, l.description ${LISTING_FROM} WHERE l.slug = ?${statusFilter} LIMIT 1`)
    .bind(slug)
    .first<ListingBaseRow & { description: string }>();
  if (!row) return null;
  const summaryRows = await hydrateListingSummaries([row]);
  const summary = summaryRows[0];

  const imageRows = await db.prepare('SELECT id, object_key, alt_text, is_primary FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, sort_order ASC, created_at ASC').bind(row.id).all<{ id: string; object_key: string; alt_text: string; is_primary: number }>();
  const images = (imageRows.results ?? []).map(image => ({ id: image.id, url: listingImageUrl(image.object_key), alt: image.alt_text, isPrimary: image.is_primary === 1 }));

  const attributeRows = await db
    .prepare(
      `SELECT ca.id AS attribute_id, ca.name, ca.slug, ca.is_required, cav.id AS value_id, cav.value, cav.label, cav.swatch_color
       FROM listing_attribute_options lao
       JOIN category_attribute_values cav ON cav.id = lao.attribute_value_id
       JOIN category_attributes ca ON ca.id = lao.attribute_id
       WHERE lao.listing_id = ? AND ca.is_active = 1
       ORDER BY ca.sort_order ASC, ca.name ASC, cav.sort_order ASC, cav.value ASC`
    )
    .bind(row.id)
    .all<AttributeJoinRow>();
  const attributes = groupAttributeRows(attributeRows.results ?? []);

  const bundleItems: BundleComponent[] = [];
  const bundleRows = await db.prepare('SELECT id, product_id, quantity FROM bundle_items WHERE bundle_id = ? ORDER BY created_at ASC, id ASC').bind(row.id).all<{ id: string; product_id: string; quantity: number }>();
  const bundleRowsList = bundleRows.results ?? [];
  if (bundleRowsList.length) {
    const productIds = Array.from(new Set(bundleRowsList.map(item => item.product_id)));
    const productRows = await db
      .prepare(`SELECT ${LISTING_SUMMARY_FIELDS} ${LISTING_FROM} WHERE l.status = 'published' AND l.id IN (${productIds.map(() => '?').join(', ')})`)
      .bind(...productIds)
      .all<ListingBaseRow>();
    const products = await hydrateListingSummaries(productRows.results ?? []);
    const productMap = new Map(products.map(product => [product.id, product]));
    const bundleItemIds = bundleRowsList.map(item => item.id);
    const bundleAttributeRows = await db
      .prepare(
        `SELECT bia.bundle_item_id, ca.id AS attribute_id, ca.name, ca.slug, ca.is_required, cav.id AS value_id, cav.value, cav.label, cav.swatch_color
         FROM bundle_item_attributes bia
         JOIN category_attribute_values cav ON cav.id = bia.attribute_value_id
         JOIN category_attributes ca ON ca.id = bia.attribute_id
         WHERE bia.bundle_item_id IN (${bundleItemIds.map(() => '?').join(', ')}) AND ca.is_active = 1
         ORDER BY ca.sort_order ASC, ca.name ASC, cav.sort_order ASC, cav.value ASC`
      )
      .bind(...bundleItemIds)
      .all<AttributeJoinRow & { bundle_item_id: string }>();
    const attributesByBundleItem = new Map<string, ListingAttributeChoice[]>();
    for (const attributeRow of bundleAttributeRows.results ?? []) {
      const list = attributesByBundleItem.get(attributeRow.bundle_item_id) ?? [];
      list.push({ attributeId: attributeRow.attribute_id, name: attributeRow.name, slug: attributeRow.slug, isRequired: attributeRow.is_required === 1, options: [{ valueId: attributeRow.value_id, value: attributeRow.value, label: attributeRow.label || attributeRow.value, swatchColor: attributeRow.swatch_color }] });
      attributesByBundleItem.set(attributeRow.bundle_item_id, list);
    }
    // Merge options that share the same attribute inside one bundle component.
    for (const [bundleItemId, list] of attributesByBundleItem) {
      const merged = new Map<string, ListingAttributeChoice>();
      for (const choice of list) {
        const existing = merged.get(choice.attributeId);
        if (existing) existing.options.push(...choice.options);
        else merged.set(choice.attributeId, { ...choice, options: [...choice.options] });
      }
      attributesByBundleItem.set(bundleItemId, Array.from(merged.values()));
    }
    for (const item of bundleRowsList) {
      const product = productMap.get(item.product_id);
      if (!product) continue;
      bundleItems.push({ bundleItemId: item.id, quantity: Number(item.quantity), product, attributes: attributesByBundleItem.get(item.id) ?? [] });
    }
  }

  const relatedRows = await db
    .prepare(`SELECT ${LISTING_SUMMARY_FIELDS} ${LISTING_FROM} JOIN related_listings rl ON rl.related_listing_id = l.id WHERE rl.listing_id = ? AND l.status = 'published' ORDER BY rl.sort_order ASC, l.created_at DESC LIMIT 8`)
    .bind(row.id)
    .all<ListingBaseRow>();
  let related = await hydrateListingSummaries(relatedRows.results ?? []);
  if (!related.length && row.category_slug) {
    const category = await db.prepare('SELECT id FROM store_categories WHERE slug = ? LIMIT 1').bind(row.category_slug).first<{ id: string }>();
    if (category) {
      const fallbackRows = await db
        .prepare(`SELECT ${LISTING_SUMMARY_FIELDS} ${LISTING_FROM} WHERE l.status = 'published' AND l.category_id = ? AND l.id <> ? ORDER BY COALESCE(l.published_at, l.created_at) DESC LIMIT 4`)
        .bind(category.id, row.id)
        .all<ListingBaseRow>();
      related = await hydrateListingSummaries(fallbackRows.results ?? []);
    }
  }

  const reviewRows = await db
    .prepare(`SELECT r.id, r.rating, r.title, r.body, r.created_at, COALESCE(NULLIF(u.display_name, ''), 'Customer') AS author_name FROM reviews r LEFT JOIN users_profile u ON u.id = r.user_id WHERE r.listing_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC LIMIT 50`)
    .bind(row.id)
    .all<{ id: string; rating: number; title: string; body: string; created_at: string; author_name: string }>();

  return {
    ...summary,
    description: row.description,
    images,
    attributes,
    bundleItems,
    related,
    reviews: (reviewRows.results ?? []).map(review => ({ id: review.id, rating: Number(review.rating), title: review.title, body: review.body, createdAt: review.created_at, authorName: review.author_name })),
  };
}

export async function listFeaturedListings(limit = 8): Promise<ListingSummary[]> {
  const db = getDatabase();
  if (!db) return [];
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const rows = await db.prepare(`SELECT ${LISTING_SUMMARY_FIELDS} ${LISTING_FROM} WHERE l.status = 'published' AND l.is_featured = 1 ORDER BY COALESCE(l.published_at, l.created_at) DESC LIMIT ?`).bind(safeLimit).all<ListingBaseRow>();
  return hydrateListingSummaries(rows.results ?? []);
}

export async function listActiveFlashDeals(limit = 8): Promise<ListingSummary[]> {
  const db = getDatabase();
  if (!db) return [];
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const now = new Date().toISOString();
  const rows = await db
    .prepare(`SELECT ${LISTING_SUMMARY_FIELDS} ${LISTING_FROM} JOIN flash_deals fd ON fd.listing_id = l.id WHERE l.status = 'published' AND fd.is_active = 1 AND fd.starts_at <= ? AND fd.ends_at > ? ORDER BY fd.ends_at ASC LIMIT ?`)
    .bind(now, now, safeLimit)
    .all<ListingBaseRow>();
  const seen = new Set<string>();
  const unique = (rows.results ?? []).filter(row => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  return hydrateListingSummaries(unique);
}

export async function activeListingDeal(listingId: string): Promise<DealInfo | null> {
  const db = getDatabase();
  if (!db) return null;
  const now = new Date().toISOString();
  const listing = await db.prepare('SELECT price_kobo FROM listings WHERE id = ? LIMIT 1').bind(listingId).first<{ price_kobo: number }>();
  if (!listing) return null;
  const priceKobo = Number(listing.price_kobo);
  const flash = await db
    .prepare('SELECT discount_type, discount_value, ends_at FROM flash_deals WHERE listing_id = ? AND is_active = 1 AND starts_at <= ? AND ends_at > ? ORDER BY created_at DESC LIMIT 1')
    .bind(listingId, now, now)
    .first<{ discount_type: string; discount_value: number; ends_at: string }>();
  if (flash) return buildDeal(priceKobo, flash.discount_type, Number(flash.discount_value), flash.ends_at);
  const discount = await db
    .prepare('SELECT discount_type, discount_value, ends_at FROM listing_discounts WHERE listing_id = ? AND is_active = 1 AND (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?) ORDER BY created_at DESC LIMIT 1')
    .bind(listingId, now, now)
    .first<{ discount_type: string; discount_value: number; ends_at: string | null }>();
  if (discount) return buildDeal(priceKobo, discount.discount_type, Number(discount.discount_value), discount.ends_at);
  return null;
}

export async function searchSuggest(q: string, limit = 8): Promise<Array<{ slug: string; title: string; priceKobo: number; imageUrl: string }>> {
  const db = getDatabase();
  if (!db || !q.trim()) return [];
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit)));
  const rows = await db
    .prepare(
      `SELECT l.slug, l.title, l.price_kobo, (SELECT li.object_key FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.is_primary DESC, li.sort_order ASC LIMIT 1) AS object_key
       FROM listings l WHERE l.status = 'published' AND lower(l.title) LIKE lower(?) ORDER BY COALESCE(l.published_at, l.created_at) DESC LIMIT ?`
    )
    .bind(`%${q.trim().slice(0, 100)}%`, safeLimit)
    .all<{ slug: string; title: string; price_kobo: number; object_key: string | null }>();
  return (rows.results ?? []).map(row => ({ slug: row.slug, title: row.title, priceKobo: Number(row.price_kobo), imageUrl: listingImageUrl(row.object_key) }));
}

// ---------- Admin catalog management ----------

export type AdminListingRow = ListingSummary & { status: string; createdAt: string; updatedAt: string; categoryId: string | null };

export async function adminListListings(opts: { status?: string; q?: string; page?: number; perPage?: number } = {}): Promise<{ listings: AdminListingRow[]; total: number; page: number; pages: number }> {
  const db = getDatabase();
  if (!db) return { listings: [], total: 0, page: 1, pages: 1 };
  const perPage = Math.min(100, Math.max(1, Math.floor(opts.perPage ?? 20)));
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where: string[] = [];
  const values: unknown[] = [];
  if (opts.status && opts.status !== 'all') { where.push('l.status = ?'); values.push(opts.status); }
  if (opts.q && opts.q.trim()) { where.push('lower(l.title) LIKE lower(?)'); values.push(`%${opts.q.trim().slice(0, 100)}%`); }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const totalRow = await db.prepare(`SELECT COUNT(*) AS total FROM listings l${whereSql}`).bind(...values).first<{ total: number }>();
  const total = Number(totalRow?.total ?? 0);
  const rows = await db
    .prepare(`SELECT ${LISTING_SUMMARY_FIELDS}, l.status, l.category_id, l.created_at, l.updated_at ${LISTING_FROM}${whereSql} ORDER BY l.updated_at DESC, l.created_at DESC LIMIT ? OFFSET ?`)
    .bind(...values, perPage, (page - 1) * perPage)
    .all<ListingBaseRow & { status: string; category_id: string | null; created_at: string; updated_at: string }>();
  const summaries = await hydrateListingSummaries(rows.results ?? []);
  const listings: AdminListingRow[] = (rows.results ?? []).map((row, index) => ({
    ...summaries[index],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryId: row.category_id,
  }));
  return { listings, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export type AdminListingDetail = {
  id: string;
  listingType: 'single' | 'bundle';
  slug: string;
  title: string;
  description: string;
  categoryId: string | null;
  priceKobo: number;
  compareAtPriceKobo: number | null;
  currency: string;
  status: string;
  isFeatured: boolean;
  isFreeShipping: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isDigital: boolean;
  digitalFileKey: string | null;
  digitalDownloadLimit: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: Array<{ id: string; objectKey: string; alt: string; sortOrder: number; isPrimary: boolean }>;
  attributeOptions: Array<{ attributeId: string; valueId: string }>;
  bundleItems: Array<{ bundleItemId: string; productId: string; quantity: number; attributeValueIds: string[] }>;
  relatedIds: string[];
};

type AdminListingRowDb = {
  id: string; listing_type: string; slug: string; title: string; description: string; category_id: string | null;
  price_kobo: number; compare_at_price_kobo: number | null; currency: string; status: string;
  is_featured: number; is_free_shipping: number; track_stock: number; stock_quantity: number; low_stock_threshold: number;
  is_digital: number; digital_file_key: string | null; digital_download_limit: number;
  published_at: string | null; created_at: string; updated_at: string;
};

export async function getAdminListing(id: string): Promise<AdminListingDetail | null> {
  const db = getDatabase();
  if (!db) return null;
  const listing = await db.prepare('SELECT id, listing_type, slug, title, description, category_id, price_kobo, compare_at_price_kobo, currency, status, is_featured, is_free_shipping, track_stock, stock_quantity, low_stock_threshold, is_digital, digital_file_key, digital_download_limit, published_at, created_at, updated_at FROM listings WHERE id = ? LIMIT 1').bind(id).first<AdminListingRowDb>();
  if (!listing) return null;
  const imageRows = await db.prepare('SELECT id, object_key, alt_text, sort_order, is_primary FROM listing_images WHERE listing_id = ? ORDER BY is_primary DESC, sort_order ASC').bind(id).all<{ id: string; object_key: string; alt_text: string; sort_order: number; is_primary: number }>();
  const optionRows = await db.prepare('SELECT attribute_id, attribute_value_id FROM listing_attribute_options WHERE listing_id = ?').bind(id).all<{ attribute_id: string; attribute_value_id: string }>();
  const bundleRows = await db.prepare('SELECT id, product_id, quantity FROM bundle_items WHERE bundle_id = ? ORDER BY created_at ASC').bind(id).all<{ id: string; product_id: string; quantity: number }>();
  const bundleIds = (bundleRows.results ?? []).map(item => item.id);
  const attributeValueIds = bundleIds.length
    ? (await db.prepare(`SELECT bundle_item_id, attribute_value_id FROM bundle_item_attributes WHERE bundle_item_id IN (${bundleIds.map(() => '?').join(', ')})`).bind(...bundleIds).all<{ bundle_item_id: string; attribute_value_id: string }>()).results ?? []
    : [];
  const relatedRows = await db.prepare('SELECT related_listing_id FROM related_listings WHERE listing_id = ? ORDER BY sort_order ASC').bind(id).all<{ related_listing_id: string }>();
  return {
    id: listing.id,
    listingType: listing.listing_type === 'bundle' ? 'bundle' : 'single',
    slug: listing.slug,
    title: listing.title,
    description: listing.description ?? '',
    categoryId: listing.category_id,
    priceKobo: Number(listing.price_kobo),
    compareAtPriceKobo: listing.compare_at_price_kobo === null || listing.compare_at_price_kobo === undefined ? null : Number(listing.compare_at_price_kobo),
    currency: listing.currency || 'NGN',
    status: listing.status,
    isFeatured: listing.is_featured === 1,
    isFreeShipping: listing.is_free_shipping === 1,
    trackStock: listing.track_stock === 1,
    stockQuantity: Number(listing.stock_quantity),
    lowStockThreshold: Number(listing.low_stock_threshold),
    isDigital: listing.is_digital === 1,
    digitalFileKey: listing.digital_file_key,
    digitalDownloadLimit: Number(listing.digital_download_limit ?? 5),
    publishedAt: listing.published_at,
    createdAt: listing.created_at,
    updatedAt: listing.updated_at,
    images: (imageRows.results ?? []).map(image => ({ id: image.id, objectKey: image.object_key, alt: image.alt_text, sortOrder: Number(image.sort_order), isPrimary: image.is_primary === 1 })),
    attributeOptions: (optionRows.results ?? []).map(option => ({ attributeId: option.attribute_id, valueId: option.attribute_value_id })),
    bundleItems: (bundleRows.results ?? []).map(item => ({ bundleItemId: item.id, productId: item.product_id, quantity: Number(item.quantity), attributeValueIds: attributeValueIds.filter(link => link.bundle_item_id === item.id).map(link => link.attribute_value_id) })),
    relatedIds: (relatedRows.results ?? []).map(row => row.related_listing_id),
  };
}

export type ListingImageInput = { objectKey: string; alt: string; sortOrder: number; isPrimary: boolean };
export type ListingInput = {
  listingType: 'single' | 'bundle';
  title: string;
  description: string;
  categoryId: string | null;
  priceKobo: number;
  compareAtPriceKobo: number | null;
  status: string;
  isFeatured: boolean;
  isFreeShipping: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isDigital: boolean;
  digitalFileKey: string | null;
  digitalDownloadLimit: number;
  images: ListingImageInput[];
  attributeOptions: Array<{ attributeId: string; valueId: string }>;
  bundleItems: Array<{ productId: string; quantity: number; attributeValueIds: string[] }>;
  relatedIds: string[];
};

function slugifyTitle(title: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || 'listing';
}

async function uniqueListingSlug(db: SqlDatabase, desired: string, excludeId?: string): Promise<string> {
  let candidate = desired;
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = excludeId
      ? await db.prepare('SELECT id FROM listings WHERE slug = ? AND id <> ? LIMIT 1').bind(candidate, excludeId).first<{ id: string }>()
      : await db.prepare('SELECT id FROM listings WHERE slug = ? LIMIT 1').bind(candidate).first<{ id: string }>();
    if (!clash) return candidate;
    candidate = `${desired}-${crypto.randomUUID().slice(0, 4)}`;
  }
  return `${desired}-${Date.now().toString(36)}`;
}

async function validateListingInput(db: SqlDatabase, input: ListingInput): Promise<void> {
  if (!input.title.trim()) throw new Error('A product title is required.');
  if (input.listingType === 'bundle' && (!input.bundleItems || input.bundleItems.length === 0)) throw new Error('A bundle must include at least one product.');
  if (input.priceKobo < 0) throw new Error('The price cannot be negative.');
  if (input.categoryId) {
    const category = await db.prepare('SELECT id FROM store_categories WHERE id = ? LIMIT 1').bind(input.categoryId).first<{ id: string }>();
    if (!category) throw new Error('The selected category does not exist.');
  }
  if (input.status === 'published' && input.categoryId) {
    const required = await db.prepare('SELECT id FROM category_attributes WHERE category_id = ? AND is_active = 1 AND is_required = 1').bind(input.categoryId).all<{ id: string }>();
    const selected = new Set((input.attributeOptions ?? []).map(option => option.attributeId));
    if ((required.results ?? []).some(attribute => !selected.has(attribute.id))) throw new Error('Choose values for every required product option before publishing.');
  }
  const bundleProductIds = Array.from(new Set((input.bundleItems ?? []).filter(item => item.productId).map(item => item.productId)));
  if (bundleProductIds.length) {
    const found = await db.prepare(`SELECT id FROM listings WHERE id IN (${bundleProductIds.map(() => '?').join(', ')})`).bind(...bundleProductIds).all<{ id: string }>();
    if ((found.results ?? []).length !== bundleProductIds.length) throw new Error('One or more bundle products no longer exist.');
  }
}

async function replaceListingChildren(db: SqlDatabase, listingId: string, input: ListingInput): Promise<void> {
  await db.prepare('DELETE FROM listing_images WHERE listing_id = ?').bind(listingId).run();
  const images = (input.images ?? []).filter(image => image.objectKey && image.objectKey.trim());
  let primaryUsed = false;
  for (const [index, image] of images.entries()) {
    const isPrimary = image.isPrimary && !primaryUsed;
    if (isPrimary) primaryUsed = true;
    await db.prepare('INSERT INTO listing_images (id, listing_id, object_key, alt_text, sort_order, is_primary) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), listingId, image.objectKey.trim(), image.alt ?? '', Math.floor(image.sortOrder ?? index), isPrimary ? 1 : 0).run();
  }
  if (images.length && !primaryUsed) {
    await db.prepare('UPDATE listing_images SET is_primary = 1 WHERE id = (SELECT id FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC LIMIT 1)').bind(listingId).run();
  }
  await db.prepare('DELETE FROM listing_attribute_options WHERE listing_id = ?').bind(listingId).run();
  for (const option of input.attributeOptions ?? []) {
    if (!option.attributeId || !option.valueId) continue;
    await db.prepare('INSERT OR IGNORE INTO listing_attribute_options (id, listing_id, attribute_id, attribute_value_id) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), listingId, option.attributeId, option.valueId).run();
  }
  await db.prepare('DELETE FROM bundle_items WHERE bundle_id = ?').bind(listingId).run();
  if (input.listingType === 'bundle') {
    for (const item of input.bundleItems ?? []) {
      if (!item.productId) continue;
      const bundleItemId = crypto.randomUUID();
      await db.prepare('INSERT INTO bundle_items (id, bundle_id, product_id, quantity) VALUES (?, ?, ?, ?)').bind(bundleItemId, listingId, item.productId, Math.max(1, Math.floor(item.quantity || 1))).run();
      const valueIds = (item.attributeValueIds ?? []).filter(Boolean);
      if (valueIds.length) {
        const valueRows = await db.prepare(`SELECT id, attribute_id FROM category_attribute_values WHERE id IN (${valueIds.map(() => '?').join(', ')})`).bind(...valueIds).all<{ id: string; attribute_id: string }>();
        for (const value of valueRows.results ?? []) {
          await db.prepare('INSERT OR IGNORE INTO bundle_item_attributes (id, bundle_item_id, attribute_id, attribute_value_id) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), bundleItemId, value.attribute_id, value.id).run();
        }
      }
    }
  }
  await db.prepare('DELETE FROM related_listings WHERE listing_id = ?').bind(listingId).run();
  for (const [index, relatedId] of (input.relatedIds ?? []).entries()) {
    if (!relatedId || relatedId === listingId) continue;
    await db.prepare('INSERT OR IGNORE INTO related_listings (id, listing_id, related_listing_id, sort_order) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), listingId, relatedId, index).run();
  }
}

export async function createListing(input: ListingInput, adminId: string): Promise<{ id: string; slug: string }> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await validateListingInput(db, input);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = await uniqueListingSlug(db, slugifyTitle(input.title));
  await db
    .prepare(
      `INSERT INTO listings (id, listing_type, slug, title, description, category_id, price_kobo, compare_at_price_kobo, currency, status, is_featured, is_free_shipping, track_stock, stock_quantity, low_stock_threshold, is_digital, digital_file_key, digital_download_limit, created_by, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.listingType === 'bundle' ? 'bundle' : 'single',
      slug,
      input.title.trim().slice(0, 200),
      input.description ?? '',
      input.categoryId || null,
      Math.max(0, Math.floor(input.priceKobo || 0)),
      input.compareAtPriceKobo === null || input.compareAtPriceKobo === undefined ? null : Math.max(0, Math.floor(input.compareAtPriceKobo)),
      'NGN',
      input.status === 'published' ? 'published' : input.status === 'archived' ? 'archived' : 'draft',
      input.isFeatured ? 1 : 0,
      input.isFreeShipping ? 1 : 0,
      input.trackStock ? 1 : 0,
      Math.max(0, Math.floor(input.stockQuantity || 0)),
      Math.max(0, Math.floor(input.lowStockThreshold || 0)),
      input.isDigital ? 1 : 0,
      input.isDigital ? input.digitalFileKey || null : null,
      Math.max(0, Math.floor(input.digitalDownloadLimit ?? 5)),
      adminId,
      input.status === 'published' ? now : null,
      now,
      now
    )
    .run();
  await replaceListingChildren(db, id, input);
  return { id, slug };
}

export async function updateListing(id: string, input: ListingInput, adminId: string): Promise<{ id: string; slug: string }> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const existing = await db.prepare('SELECT id, slug, stock_quantity, published_at FROM listings WHERE id = ? LIMIT 1').bind(id).first<{ id: string; slug: string; stock_quantity: number; published_at: string | null }>();
  if (!existing) throw new Error('Listing not found.');
  await validateListingInput(db, input);
  const now = new Date().toISOString();
  const desiredSlug = slugifyTitle(input.title);
  const slug = existing.slug === desiredSlug || existing.slug.startsWith(`${desiredSlug}-`) ? existing.slug : await uniqueListingSlug(db, desiredSlug, id);
  const nextStock = Math.max(0, Math.floor(input.stockQuantity || 0));
  const publishedAt = input.status === 'published' ? existing.published_at ?? now : existing.published_at;
  await db
    .prepare(
      `UPDATE listings SET listing_type = ?, slug = ?, title = ?, description = ?, category_id = ?, price_kobo = ?, compare_at_price_kobo = ?, status = ?, is_featured = ?, is_free_shipping = ?, track_stock = ?, stock_quantity = ?, low_stock_threshold = ?, is_digital = ?, digital_file_key = ?, digital_download_limit = ?, published_at = ?, updated_at = ? WHERE id = ?`
    )
    .bind(
      input.listingType === 'bundle' ? 'bundle' : 'single',
      slug,
      input.title.trim().slice(0, 200),
      input.description ?? '',
      input.categoryId || null,
      Math.max(0, Math.floor(input.priceKobo || 0)),
      input.compareAtPriceKobo === null || input.compareAtPriceKobo === undefined ? null : Math.max(0, Math.floor(input.compareAtPriceKobo)),
      input.status === 'published' ? 'published' : input.status === 'archived' ? 'archived' : 'draft',
      input.isFeatured ? 1 : 0,
      input.isFreeShipping ? 1 : 0,
      input.trackStock ? 1 : 0,
      nextStock,
      Math.max(0, Math.floor(input.lowStockThreshold || 0)),
      input.isDigital ? 1 : 0,
      input.isDigital ? input.digitalFileKey || null : null,
      Math.max(0, Math.floor(input.digitalDownloadLimit ?? 5)),
      publishedAt,
      now,
      id
    )
    .run();
  if (nextStock !== Number(existing.stock_quantity)) {
    await db.prepare('INSERT INTO inventory_logs (id, listing_id, quantity_change, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, nextStock - Number(existing.stock_quantity), 'admin_adjust', adminId, now).run();
  }
  await replaceListingChildren(db, id, input);
  return { id, slug };
}

export async function setListingStatus(id: string, status: string, adminId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const nextStatus = status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'draft';
  const existing = await db.prepare('SELECT id, published_at FROM listings WHERE id = ? LIMIT 1').bind(id).first<{ id: string; published_at: string | null }>();
  if (!existing) throw new Error('Listing not found.');
  const now = new Date().toISOString();
  const publishedAt = nextStatus === 'published' ? existing.published_at ?? now : existing.published_at;
  await db.prepare('UPDATE listings SET status = ?, published_at = ?, updated_at = ? WHERE id = ?').bind(nextStatus, publishedAt, now, id).run();
  await db.prepare('INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), adminId, `listing.${nextStatus === 'published' ? 'publish' : nextStatus}`, 'listing', id).run();
}

export async function deleteListing(id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('DELETE FROM listings WHERE id = ?').bind(id).run();
}

export async function saveCategory(categoryId: string, patch: { isActive?: boolean; sortOrder?: number; description?: string; name?: string }): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name.trim().slice(0, 120)); }
  if (patch.description !== undefined) { sets.push('description = ?'); values.push(patch.description.slice(0, 1000)); }
  if (patch.isActive !== undefined) { sets.push('is_active = ?'); values.push(patch.isActive ? 1 : 0); }
  if (patch.sortOrder !== undefined) { sets.push('sort_order = ?'); values.push(Math.floor(patch.sortOrder)); }
  if (!sets.length) return;
  await db.prepare(`UPDATE store_categories SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, categoryId).run();
}

export type CategoryAttributeInput = {
  id?: string;
  name: string;
  slug: string;
  inputType: 'select' | 'text';
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  values: Array<{ id?: string; value: string; label: string; swatchColor?: string | null; sortOrder?: number }>;
};

export async function saveCategoryAttribute(categoryId: string, input: CategoryAttributeInput): Promise<{ id: string }> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  if (!input.name.trim()) throw new Error('An option group name is required.');
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
  if (!slug) throw new Error('An option group slug is required.');
  const attributeId = input.id ?? crypto.randomUUID();
  if (input.id) {
    const existing = await db.prepare('SELECT id FROM category_attributes WHERE id = ? AND category_id = ? LIMIT 1').bind(attributeId, categoryId).first<{ id: string }>();
    if (!existing) throw new Error('Option group not found for this category.');
    await db
      .prepare('UPDATE category_attributes SET name = ?, slug = ?, input_type = ?, is_required = ?, is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND category_id = ?')
      .bind(input.name.trim().slice(0, 120), slug, input.inputType === 'text' ? 'text' : 'select', input.isRequired ? 1 : 0, input.isActive ? 1 : 0, Math.floor(input.sortOrder || 0), attributeId, categoryId)
      .run();
  } else {
    const clash = await db.prepare('SELECT id FROM category_attributes WHERE category_id = ? AND slug = ? LIMIT 1').bind(categoryId, slug).first<{ id: string }>();
    if (clash) throw new Error('This category already has an option group with that slug.');
    await db
      .prepare('INSERT INTO category_attributes (id, category_id, name, slug, input_type, is_required, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
      .bind(attributeId, categoryId, input.name.trim().slice(0, 120), slug, input.inputType === 'text' ? 'text' : 'select', input.isRequired ? 1 : 0, input.isActive ? 1 : 0, Math.floor(input.sortOrder || 0))
      .run();
  }
  const existingValues = await db.prepare('SELECT id FROM category_attribute_values WHERE attribute_id = ?').bind(attributeId).all<{ id: string }>();
  const keepIds = new Set((input.values ?? []).map(value => value.id).filter((id): id is string => Boolean(id)));
  for (const existingValue of existingValues.results ?? []) {
    if (!keepIds.has(existingValue.id)) await db.prepare('DELETE FROM category_attribute_values WHERE id = ?').bind(existingValue.id).run();
  }
  for (const [index, value] of (input.values ?? []).entries()) {
    if (!value.value.trim()) continue;
    const label = (value.label ?? '').trim() || value.value.trim();
    if (value.id && keepIds.has(value.id)) {
      await db.prepare('UPDATE category_attribute_values SET value = ?, label = ?, swatch_color = ?, sort_order = ? WHERE id = ? AND attribute_id = ?').bind(value.value.trim().slice(0, 120), label.slice(0, 120), value.swatchColor?.trim() || null, Math.floor(value.sortOrder ?? index), value.id, attributeId).run();
    } else {
      await db.prepare('INSERT INTO category_attribute_values (id, attribute_id, value, label, swatch_color, sort_order) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), attributeId, value.value.trim().slice(0, 120), label.slice(0, 120), value.swatchColor?.trim() || null, Math.floor(value.sortOrder ?? index)).run();
    }
  }
  return { id: attributeId };
}

export async function deleteCategoryAttribute(attributeId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('DELETE FROM category_attributes WHERE id = ?').bind(attributeId).run();
}
