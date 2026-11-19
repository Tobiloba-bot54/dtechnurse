
import { getDatabase } from '@/lib/server/db';

export type CouponRecord = {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmountKobo: number;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CouponInput = {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmountKobo: number;
  maxUses: number | null;
  perUserLimit: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

type CouponRow = { id: string; code: string; description: string; discount_type: string; discount_value: number; min_order_amount_kobo: number; max_uses: number | null; used_count: number; per_user_limit: number; starts_at: string | null; ends_at: string | null; is_active: number; created_at: string; updated_at: string };

function mapCoupon(row: CouponRow): CouponRecord {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(row.discount_value),
    minOrderAmountKobo: Number(row.min_order_amount_kobo),
    maxUses: row.max_uses === null || row.max_uses === undefined ? null : Number(row.max_uses),
    usedCount: Number(row.used_count),
    perUserLimit: Number(row.per_user_limit),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCoupons(): Promise<CouponRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.prepare('SELECT id, code, description, discount_type, discount_value, min_order_amount_kobo, max_uses, used_count, per_user_limit, starts_at, ends_at, is_active, created_at, updated_at FROM coupons ORDER BY created_at DESC LIMIT 200').all<CouponRow>();
  return (rows.results ?? []).map(mapCoupon);
}

export async function createCoupon(input: CouponInput): Promise<CouponRecord> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const code = input.code.trim().slice(0, 60);
  if (!code) throw new Error('A coupon code is required.');
  const discountType = input.discountType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Math.floor(input.discountValue);
  if (!(discountValue > 0)) throw new Error('The discount value must be greater than zero.');
  if (discountType === 'percentage' && discountValue > 100) throw new Error('A percentage discount cannot exceed 100.');
  const clash = await db.prepare('SELECT id FROM coupons WHERE code = ? LIMIT 1').bind(code).first<{ id: string }>();
  if (clash) throw new Error('A coupon with this code already exists.');
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount_kobo, max_uses, per_user_limit, starts_at, ends_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
    .bind(id, code, input.description ?? '', discountType, discountValue, Math.max(0, Math.floor(input.minOrderAmountKobo || 0)), input.maxUses === null || input.maxUses === undefined ? null : Math.max(0, Math.floor(input.maxUses)), Math.max(0, Math.floor(input.perUserLimit ?? 1)), input.startsAt?.trim() || null, input.endsAt?.trim() || null, input.isActive ? 1 : 0)
    .run();
  const row = await db.prepare('SELECT id, code, description, discount_type, discount_value, min_order_amount_kobo, max_uses, used_count, per_user_limit, starts_at, ends_at, is_active, created_at, updated_at FROM coupons WHERE id = ? LIMIT 1').bind(id).first<CouponRow>();
  if (!row) throw new Error('The coupon could not be created.');
  return mapCoupon(row);
}

export async function updateCoupon(id: string, patch: Partial<CouponInput>): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.code !== undefined) { sets.push('code = ?'); values.push(patch.code.trim().slice(0, 60)); }
  if (patch.description !== undefined) { sets.push('description = ?'); values.push(patch.description.slice(0, 500)); }
  if (patch.discountType !== undefined) { sets.push('discount_type = ?'); values.push(patch.discountType === 'fixed' ? 'fixed' : 'percentage'); }
  if (patch.discountValue !== undefined) { sets.push('discount_value = ?'); values.push(Math.max(1, Math.floor(patch.discountValue))); }
  if (patch.minOrderAmountKobo !== undefined) { sets.push('min_order_amount_kobo = ?'); values.push(Math.max(0, Math.floor(patch.minOrderAmountKobo))); }
  if (patch.maxUses !== undefined) { sets.push('max_uses = ?'); values.push(patch.maxUses === null ? null : Math.max(0, Math.floor(patch.maxUses))); }
  if (patch.perUserLimit !== undefined) { sets.push('per_user_limit = ?'); values.push(Math.max(0, Math.floor(patch.perUserLimit))); }
  if (patch.startsAt !== undefined) { sets.push('starts_at = ?'); values.push(patch.startsAt?.trim() || null); }
  if (patch.endsAt !== undefined) { sets.push('ends_at = ?'); values.push(patch.endsAt?.trim() || null); }
  if (patch.isActive !== undefined) { sets.push('is_active = ?'); values.push(patch.isActive ? 1 : 0); }
  if (!sets.length) return;
  await db.prepare(`UPDATE coupons SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
}

export async function deleteCoupon(id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('DELETE FROM coupons WHERE id = ?').bind(id).run();
}

export type FlashDealRecord = {
  id: string;
  listingId: string;
  listingTitle: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type DealRow = { id: string; listing_id: string; listing_title: string | null; discount_type: string; discount_value: number; starts_at: string | null; ends_at: string | null; is_active: number; created_at: string; updated_at: string };

function mapFlashDeal(row: DealRow): FlashDealRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title ?? '',
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(row.discount_value),
    startsAt: row.starts_at ?? '',
    endsAt: row.ends_at ?? '',
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateDiscount(discountType: string, discountValue: number): void {
  if (discountType !== 'percentage' && discountType !== 'fixed') throw new Error('The discount type must be percentage or fixed.');
  if (!(Math.floor(discountValue) > 0)) throw new Error('The discount value must be greater than zero.');
  if (discountType === 'percentage' && discountValue > 100) throw new Error('A percentage discount cannot exceed 100.');
}

export async function listFlashDeals(): Promise<FlashDealRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.prepare('SELECT fd.id, fd.listing_id, l.title AS listing_title, fd.discount_type, fd.discount_value, fd.starts_at, fd.ends_at, fd.is_active, fd.created_at, fd.updated_at FROM flash_deals fd LEFT JOIN listings l ON l.id = fd.listing_id ORDER BY fd.created_at DESC LIMIT 200').all<DealRow>();
  return (rows.results ?? []).map(mapFlashDeal);
}

export async function createFlashDeal(input: { listingId: string; discountType: 'percentage' | 'fixed'; discountValue: number; startsAt: string; endsAt: string; isActive: boolean }): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  validateDiscount(input.discountType, input.discountValue);
  if (!input.startsAt?.trim() || !input.endsAt?.trim()) throw new Error('A flash deal needs a start and end time.');
  const listing = await db.prepare('SELECT id FROM listings WHERE id = ? LIMIT 1').bind(input.listingId).first<{ id: string }>();
  if (!listing) throw new Error('The product for this flash deal does not exist.');
  await db
    .prepare('INSERT INTO flash_deals (id, listing_id, discount_type, discount_value, starts_at, ends_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
    .bind(crypto.randomUUID(), input.listingId, input.discountType, Math.floor(input.discountValue), input.startsAt.trim(), input.endsAt.trim(), input.isActive ? 1 : 0)
    .run();
}

export async function updateFlashDeal(id: string, patch: Partial<{ listingId: string; discountType: 'percentage' | 'fixed'; discountValue: number; startsAt: string; endsAt: string; isActive: boolean }>): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.listingId !== undefined) { sets.push('listing_id = ?'); values.push(patch.listingId); }
  if (patch.discountType !== undefined) { sets.push('discount_type = ?'); values.push(patch.discountType === 'fixed' ? 'fixed' : 'percentage'); }
  if (patch.discountValue !== undefined) { sets.push('discount_value = ?'); values.push(Math.max(1, Math.floor(patch.discountValue))); }
  if (patch.startsAt !== undefined) { sets.push('starts_at = ?'); values.push(patch.startsAt.trim()); }
  if (patch.endsAt !== undefined) { sets.push('ends_at = ?'); values.push(patch.endsAt.trim()); }
  if (patch.isActive !== undefined) { sets.push('is_active = ?'); values.push(patch.isActive ? 1 : 0); }
  if (!sets.length) return;
  await db.prepare(`UPDATE flash_deals SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
}

export async function deleteFlashDeal(id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('DELETE FROM flash_deals WHERE id = ?').bind(id).run();
}

export type ListingDiscountRecord = {
  id: string;
  listingId: string;
  listingTitle: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function mapListingDiscount(row: DealRow): ListingDiscountRecord {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title ?? '',
    discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(row.discount_value),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listListingDiscounts(): Promise<ListingDiscountRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.prepare('SELECT ld.id, ld.listing_id, l.title AS listing_title, ld.discount_type, ld.discount_value, ld.starts_at, ld.ends_at, ld.is_active, ld.created_at, ld.updated_at FROM listing_discounts ld LEFT JOIN listings l ON l.id = ld.listing_id ORDER BY ld.created_at DESC LIMIT 200').all<DealRow>();
  return (rows.results ?? []).map(mapListingDiscount);
}

export async function createListingDiscount(input: { listingId: string; discountType: 'percentage' | 'fixed'; discountValue: number; startsAt?: string | null; endsAt?: string | null; isActive: boolean }): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  validateDiscount(input.discountType, input.discountValue);
  const listing = await db.prepare('SELECT id FROM listings WHERE id = ? LIMIT 1').bind(input.listingId).first<{ id: string }>();
  if (!listing) throw new Error('The product for this discount does not exist.');
  await db
    .prepare('INSERT INTO listing_discounts (id, listing_id, discount_type, discount_value, starts_at, ends_at, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
    .bind(crypto.randomUUID(), input.listingId, input.discountType, Math.floor(input.discountValue), input.startsAt?.trim() || null, input.endsAt?.trim() || null, input.isActive ? 1 : 0)
    .run();
}

export async function updateListingDiscount(id: string, patch: Partial<{ listingId: string; discountType: 'percentage' | 'fixed'; discountValue: number; startsAt?: string | null; endsAt?: string | null; isActive: boolean }>): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.listingId !== undefined) { sets.push('listing_id = ?'); values.push(patch.listingId); }
  if (patch.discountType !== undefined) { sets.push('discount_type = ?'); values.push(patch.discountType === 'fixed' ? 'fixed' : 'percentage'); }
  if (patch.discountValue !== undefined) { sets.push('discount_value = ?'); values.push(Math.max(1, Math.floor(patch.discountValue))); }
  if (patch.startsAt !== undefined) { sets.push('starts_at = ?'); values.push(patch.startsAt?.trim() || null); }
  if (patch.endsAt !== undefined) { sets.push('ends_at = ?'); values.push(patch.endsAt?.trim() || null); }
  if (patch.isActive !== undefined) { sets.push('is_active = ?'); values.push(patch.isActive ? 1 : 0); }
  if (!sets.length) return;
  await db.prepare(`UPDATE listing_discounts SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...values, id).run();
}

export async function deleteListingDiscount(id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('DELETE FROM listing_discounts WHERE id = ?').bind(id).run();
}

export type GiftCardAdminRecord = {
  id: string;
  code: string;
  initialAmountKobo: number;
  balanceKobo: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
};

type GiftCardRow = { id: string; code: string; initial_amount_kobo: number; balance_kobo: number; status: string; expires_at: string | null; created_at: string };

function mapGiftCard(row: GiftCardRow): GiftCardAdminRecord {
  return { id: row.id, code: row.code, initialAmountKobo: Number(row.initial_amount_kobo), balanceKobo: Number(row.balance_kobo), status: row.status, expiresAt: row.expires_at, createdAt: row.created_at };
}

export async function listGiftCards(): Promise<GiftCardAdminRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.prepare('SELECT id, code, initial_amount_kobo, balance_kobo, status, expires_at, created_at FROM gift_cards ORDER BY created_at DESC LIMIT 200').all<GiftCardRow>();
  return (rows.results ?? []).map(mapGiftCard);
}

export async function createGiftCard(input: { initialAmountKobo: number; expiresAt?: string | null }): Promise<GiftCardAdminRecord> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const initialAmountKobo = Math.floor(input.initialAmountKobo);
  if (!(initialAmountKobo > 0)) throw new Error('The gift card amount must be greater than zero.');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let code = '';
  for (let attempt = 0; attempt < 8; attempt++) {
    let suffix = '';
    for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    const candidate = `DTN-GC-${suffix}`;
    const clash = await db.prepare('SELECT id FROM gift_cards WHERE code = ? LIMIT 1').bind(candidate).first<{ id: string }>();
    if (!clash) { code = candidate; break; }
  }
  if (!code) throw new Error('A unique gift card code could not be generated. Try again.');
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO gift_cards (id, code, initial_amount_kobo, balance_kobo, status, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
    .bind(id, code, initialAmountKobo, initialAmountKobo, 'active', input.expiresAt?.trim() || null)
    .run();
  const row = await db.prepare('SELECT id, code, initial_amount_kobo, balance_kobo, status, expires_at, created_at FROM gift_cards WHERE id = ? LIMIT 1').bind(id).first<GiftCardRow>();
  if (!row) throw new Error('The gift card could not be created.');
  return mapGiftCard(row);
}

export async function setGiftCardStatus(id: string, status: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  if (!['active', 'redeemed', 'expired', 'disabled'].includes(status)) throw new Error('Unknown gift card status.');
  await db.prepare('UPDATE gift_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id).run();
}
