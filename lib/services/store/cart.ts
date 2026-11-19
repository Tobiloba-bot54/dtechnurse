
import { getDatabase, type SqlDatabase } from '@/lib/server/db';
import { listingImageUrl } from './catalog';
import { parseSelectedAttributes, type CartLine, type CartState } from './types';

export type CartRow = { id: string; coupon_id: string | null };

export async function getOrCreateCart(userId: string): Promise<CartRow> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const existing = await db.prepare("SELECT id, coupon_id FROM carts WHERE user_id = ? AND status = 'active' LIMIT 1").bind(userId).first<CartRow>();
  if (existing) return existing;
  const id = crypto.randomUUID();
  await db.prepare("INSERT INTO carts (id, user_id, status) VALUES (?, ?, 'active')").bind(id, userId).run();
  return { id, coupon_id: null };
}

type CouponRow = { id: string; code: string; discount_type: string; discount_value: number; min_order_amount_kobo: number; max_uses: number | null; used_count: number; starts_at: string | null; ends_at: string | null; is_active: number };

export type CouponEvaluation = { ok: true; discountKobo: number; code: string } | { ok: false; error: string };

export async function evaluateCoupon(couponId: string, subtotalKobo: number): Promise<CouponEvaluation> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const coupon = await db.prepare('SELECT id, code, discount_type, discount_value, min_order_amount_kobo, max_uses, used_count, starts_at, ends_at, is_active FROM coupons WHERE id = ? LIMIT 1').bind(couponId).first<CouponRow>();
  if (!coupon || coupon.is_active !== 1) return { ok: false, error: 'This coupon is no longer available.' };
  const now = new Date().toISOString();
  if (coupon.starts_at && coupon.starts_at > now) return { ok: false, error: 'This coupon is not active yet.' };
  if (coupon.ends_at && coupon.ends_at <= now) return { ok: false, error: 'This coupon has expired.' };
  if (coupon.max_uses !== null && coupon.max_uses !== undefined && Number(coupon.used_count) >= Number(coupon.max_uses)) return { ok: false, error: 'This coupon has reached its usage limit.' };
  if (subtotalKobo < Number(coupon.min_order_amount_kobo)) return { ok: false, error: 'Your cart total does not meet the coupon minimum.' };
  const value = Number(coupon.discount_value);
  const discountKobo = coupon.discount_type === 'fixed' ? Math.min(value, subtotalKobo) : Math.floor((subtotalKobo * value) / 100);
  return { ok: true, discountKobo, code: coupon.code };
}

type CartItemJoinRow = {
  id: string;
  quantity: number;
  selected_attributes: string;
  listing_id: string;
  slug: string;
  title: string;
  listing_type: string;
  price_kobo: number;
  is_free_shipping: number;
  is_digital: number;
  track_stock: number;
  stock_quantity: number;
  image_key: string | null;
};

const CART_LINE_FIELDS = 'ci.id, ci.quantity, ci.selected_attributes, l.id AS listing_id, l.slug, l.title, l.listing_type, l.price_kobo, l.is_free_shipping, l.is_digital, l.track_stock, l.stock_quantity, (SELECT li.object_key FROM listing_images li WHERE li.listing_id = l.id ORDER BY li.is_primary DESC, li.sort_order ASC, li.created_at ASC LIMIT 1) AS image_key';

function mapCartLine(row: CartItemJoinRow): CartLine {
  // The current listing price wins; the stored cart snapshot is only a fallback.
  const unitPriceKobo = Number(row.price_kobo);
  const quantity = Math.max(1, Number(row.quantity));
  return {
    id: row.id,
    listingId: row.listing_id,
    slug: row.slug,
    title: row.title,
    listingType: row.listing_type === 'bundle' ? 'bundle' : 'single',
    quantity,
    unitPriceKobo,
    lineTotalKobo: unitPriceKobo * quantity,
    selectedAttributes: parseSelectedAttributes(row.selected_attributes),
    imageUrl: listingImageUrl(row.image_key),
    isFreeShipping: row.is_free_shipping === 1,
    isDigital: row.is_digital === 1,
    trackStock: row.track_stock === 1,
    stockQuantity: Number(row.stock_quantity),
  };
}

export async function getCartState(userId: string): Promise<CartState> {
  const cart = await getOrCreateCart(userId);
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const rows = await db
    .prepare(`SELECT ${CART_LINE_FIELDS} FROM cart_items ci JOIN listings l ON l.id = ci.listing_id WHERE ci.cart_id = ? AND l.status = 'published' ORDER BY ci.created_at ASC, ci.id ASC`)
    .bind(cart.id)
    .all<CartItemJoinRow>();
  const lines = (rows.results ?? []).map(mapCartLine);
  const subtotalKobo = lines.reduce((sum, line) => sum + line.lineTotalKobo, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  let discountKobo = 0;
  let couponCode: string | null = null;
  if (cart.coupon_id) {
    const evaluation = await evaluateCoupon(cart.coupon_id, subtotalKobo);
    if (evaluation.ok) {
      discountKobo = evaluation.discountKobo;
      couponCode = evaluation.code;
    } else {
      await db.prepare('UPDATE carts SET coupon_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(cart.id).run();
    }
  }
  return { cartId: cart.id, lines, totals: { subtotalKobo, discountKobo, couponCode, itemCount } };
}

export function normalizeAttributesJson(attrs: Record<string, string>): string {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof key === 'string' && key.trim() && typeof value === 'string' && value.trim()) clean[key.trim()] = value.trim();
  }
  return JSON.stringify(clean, Object.keys(clean).sort());
}

async function assertStockAvailable(db: SqlDatabase, listingId: string, quantity: number): Promise<void> {
  const listing = await db.prepare('SELECT id, title, listing_type, track_stock, stock_quantity FROM listings WHERE id = ? LIMIT 1').bind(listingId).first<{ id: string; title: string; listing_type: string; track_stock: number; stock_quantity: number }>();
  if (!listing) throw new Error('This product is no longer available.');
  if (listing.track_stock === 1 && Number(listing.stock_quantity) < quantity) throw new Error(`Insufficient stock for ${listing.title}.`);
  if (listing.listing_type === 'bundle') {
    const components = await db
      .prepare('SELECT bi.quantity, l.id, l.title, l.track_stock, l.stock_quantity FROM bundle_items bi JOIN listings l ON l.id = bi.product_id WHERE bi.bundle_id = ?')
      .bind(listingId)
      .all<{ quantity: number; id: string; title: string; track_stock: number; stock_quantity: number }>();
    for (const component of components.results ?? []) {
      if (component.track_stock === 1 && Number(component.stock_quantity) < quantity * Number(component.quantity)) {
        throw new Error(`Insufficient stock for ${component.title}.`);
      }
    }
  }
}

export async function addToCart(userId: string, input: { listingId: string; quantity: number; selectedAttributes?: Record<string, string> }): Promise<CartState> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const listing = await db.prepare("SELECT id, price_kobo FROM listings WHERE id = ? AND status = 'published' LIMIT 1").bind(input.listingId).first<{ id: string; price_kobo: number }>();
  if (!listing) throw new Error('This product is not available.');
  await assertStockAvailable(db, listing.id, quantity);
  const cart = await getOrCreateCart(userId);
  const attributesJson = normalizeAttributesJson(input.selectedAttributes ?? {});
  const existing = await db.prepare('SELECT id FROM cart_items WHERE cart_id = ? AND listing_id = ? AND selected_attributes = ? LIMIT 1').bind(cart.id, listing.id, attributesJson).first<{ id: string }>();
  if (existing) {
    await db.prepare('UPDATE cart_items SET quantity = quantity + ?, unit_price_kobo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(quantity, Number(listing.price_kobo), existing.id).run();
  } else {
    await db.prepare('INSERT INTO cart_items (id, cart_id, listing_id, quantity, selected_attributes, unit_price_kobo) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), cart.id, listing.id, quantity, attributesJson, Number(listing.price_kobo)).run();
  }
  await db.prepare('UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(cart.id).run();
  return getCartState(userId);
}

export async function updateCartItem(userId: string, itemId: string, quantity: number): Promise<CartState> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const cart = await getOrCreateCart(userId);
  const item = await db.prepare('SELECT id, listing_id FROM cart_items WHERE id = ? AND cart_id = ? LIMIT 1').bind(itemId, cart.id).first<{ id: string; listing_id: string }>();
  if (!item) throw new Error('Cart item not found.');
  const nextQuantity = Math.floor(Number(quantity));
  if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
    await db.prepare('DELETE FROM cart_items WHERE id = ?').bind(item.id).run();
    return getCartState(userId);
  }
  await assertStockAvailable(db, item.listing_id, nextQuantity);
  await db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(nextQuantity, item.id).run();
  return getCartState(userId);
}

export async function removeFromCart(userId: string, itemId: string): Promise<CartState> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const cart = await getOrCreateCart(userId);
  await db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').bind(itemId, cart.id).run();
  return getCartState(userId);
}

export async function clearCart(userId: string): Promise<CartState> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const cart = await getOrCreateCart(userId);
  await db.prepare('DELETE FROM cart_items WHERE cart_id = ?').bind(cart.id).run();
  await db.prepare('UPDATE carts SET coupon_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(cart.id).run();
  return getCartState(userId);
}

export async function applyCoupon(userId: string, code: string): Promise<{ ok: true; discountKobo: number } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: 'Enter a coupon code.' };
  const coupon = await db.prepare('SELECT id FROM coupons WHERE code = ? LIMIT 1').bind(trimmed).first<{ id: string }>();
  if (!coupon) return { ok: false, error: 'This coupon code is not valid.' };
  const state = await getCartState(userId);
  if (!state.lines.length) return { ok: false, error: 'Your cart is empty.' };
  const evaluation = await evaluateCoupon(coupon.id, state.totals.subtotalKobo);
  if (!evaluation.ok) return { ok: false, error: evaluation.error };
  const cart = await getOrCreateCart(userId);
  await db.prepare('UPDATE carts SET coupon_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(coupon.id, cart.id).run();
  return { ok: true, discountKobo: evaluation.discountKobo };
}

export async function removeCoupon(userId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const cart = await getOrCreateCart(userId);
  await db.prepare('UPDATE carts SET coupon_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(cart.id).run();
}

export async function validateGiftCard(code: string): Promise<{ ok: true; giftCardId: string; balanceKobo: number } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: 'Enter a gift card code.' };
  const card = await db.prepare('SELECT id, balance_kobo, status, expires_at FROM gift_cards WHERE code = ? LIMIT 1').bind(trimmed).first<{ id: string; balance_kobo: number; status: string; expires_at: string | null }>();
  if (!card) return { ok: false, error: 'Gift card code not found.' };
  if (card.status !== 'active') return { ok: false, error: 'This gift card is no longer active.' };
  if (Number(card.balance_kobo) <= 0) return { ok: false, error: 'This gift card has no balance left.' };
  if (card.expires_at && card.expires_at <= new Date().toISOString()) return { ok: false, error: 'This gift card has expired.' };
  return { ok: true, giftCardId: card.id, balanceKobo: Number(card.balance_kobo) };
}
