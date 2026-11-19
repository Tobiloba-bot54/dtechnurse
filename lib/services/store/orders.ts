
import { getDatabase, type SqlDatabase } from '@/lib/server/db';
import { initializeTransaction, verifyTransaction } from '@/lib/services/paystack';
import { getPaymentGatewayConfig, getStoreSettings } from './settings';
import { getCartState, getOrCreateCart, validateGiftCard } from './cart';
import { quoteShipping } from './shipping';
import { listingImageUrl } from './catalog';
import { sendOrderEmails } from './emails';
import { ORDER_STATUS_LABELS, ORDER_STATUS_VALUES, parseSelectedAttributes, type OrderDetail, type OrderEvent, type OrderItemRecord, type OrderStatus, type OrderSummary } from './types';

function asOrderStatus(value: string): OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value) ? (value as OrderStatus) : 'pending_payment';
}

const RANDOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

function randomAlphanumerics(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)];
  return out;
}

async function generateOrderNumber(db: SqlDatabase, prefix: string): Promise<string> {
  const safePrefix = prefix.trim().slice(0, 12) || 'DTN';
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = `${safePrefix}-${Date.now().toString(36).toUpperCase()}${randomAlphanumerics(4)}`;
    const clash = await db.prepare('SELECT id FROM orders WHERE order_number = ? LIMIT 1').bind(candidate).first<{ id: string }>();
    if (!clash) return candidate;
  }
  return `${safePrefix}-${Date.now().toString(36).toUpperCase()}${randomAlphanumerics(8)}`;
}

async function insertHistory(db: SqlDatabase, orderId: string, status: OrderStatus, note: string, changedBy: string | null): Promise<void> {
  await db.prepare('INSERT INTO order_status_history (id, order_id, status, note, changed_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), orderId, status, note, changedBy, new Date().toISOString()).run();
}

async function insertNotification(db: SqlDatabase, userId: string, type: string, title: string, body: string): Promise<void> {
  await db.prepare("INSERT INTO notifications (id, user_id, channel, type, title, body, data, created_at) VALUES (?, ?, 'in_app', ?, ?, ?, '{}', ?)").bind(crypto.randomUUID(), userId, type, title, body, new Date().toISOString()).run();
}

async function sumGiftCardApplied(db: SqlDatabase, orderId: string): Promise<number> {
  const row = await db.prepare('SELECT COALESCE(SUM(amount_kobo), 0) AS applied FROM gift_card_transactions WHERE order_id = ?').bind(orderId).first<{ applied: number }>();
  return Number(row?.applied ?? 0);
}

// Builds a listingId -> needed quantity map for one order line, expanding bundle components.
async function collectStockNeeds(db: SqlDatabase, listingId: string, quantity: number, needs: Map<string, number>, titles: Map<string, string>): Promise<void> {
  const listing = await db.prepare('SELECT id, title, listing_type, track_stock FROM listings WHERE id = ? LIMIT 1').bind(listingId).first<{ id: string; title: string; listing_type: string; track_stock: number }>();
  if (!listing) return;
  titles.set(listing.id, listing.title);
  if (listing.track_stock === 1) needs.set(listing.id, (needs.get(listing.id) ?? 0) + quantity);
  if (listing.listing_type === 'bundle') {
    const components = await db
      .prepare('SELECT bi.quantity, l.id, l.title, l.track_stock FROM bundle_items bi JOIN listings l ON l.id = bi.product_id WHERE bi.bundle_id = ?')
      .bind(listingId)
      .all<{ quantity: number; id: string; title: string; track_stock: number }>();
    for (const component of components.results ?? []) {
      titles.set(component.id, component.title);
      if (component.track_stock === 1) needs.set(component.id, (needs.get(component.id) ?? 0) + quantity * Number(component.quantity));
    }
  }
}

async function restockForOrder(db: SqlDatabase, orderId: string, reason: string, actorId: string | null): Promise<void> {
  const now = new Date().toISOString();
  const items = await db
    .prepare('SELECT oi.listing_id, oi.quantity, oi.listing_type, l.track_stock FROM order_items oi LEFT JOIN listings l ON l.id = oi.listing_id WHERE oi.order_id = ?')
    .bind(orderId)
    .all<{ listing_id: string | null; quantity: number; listing_type: string; track_stock: number | null }>();
  const changes = new Map<string, number>();
  for (const item of items.results ?? []) {
    if (!item.listing_id) continue;
    if (item.track_stock === 1) changes.set(item.listing_id, (changes.get(item.listing_id) ?? 0) + Number(item.quantity));
    if (item.listing_type === 'bundle') {
      const components = await db
        .prepare('SELECT bi.product_id, bi.quantity, l.track_stock FROM bundle_items bi JOIN listings l ON l.id = bi.product_id WHERE bi.bundle_id = ?')
        .bind(item.listing_id)
        .all<{ product_id: string; quantity: number; track_stock: number }>();
      for (const component of components.results ?? []) {
        if (component.track_stock === 1) changes.set(component.product_id, (changes.get(component.product_id) ?? 0) + Number(item.quantity) * Number(component.quantity));
      }
    }
  }
  for (const [listingId, quantity] of changes) {
    await db.prepare('UPDATE listings SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(quantity, listingId).run();
    await db.prepare('INSERT INTO inventory_logs (id, listing_id, quantity_change, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), listingId, quantity, reason, actorId, now).run();
  }
}

async function initializePaystackWithSecret(secretKey: string, input: { email: string; amountKobo: number; reference: string; callbackUrl: string }): Promise<{ authorizationUrl: string; reference: string }> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, amount: input.amountKobo, reference: input.reference, callback_url: input.callbackUrl }),
    cache: 'no-store',
  });
  const payload = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } };
  if (!response.ok || !payload.status || !payload.data?.authorization_url) throw new Error(payload.message || 'Paystack checkout could not be initialized.');
  return { authorizationUrl: payload.data.authorization_url, reference: payload.data.reference ?? input.reference };
}

async function verifyPaystackWithSecret(secretKey: string, reference: string): Promise<{ status: string; amount: number }> {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secretKey}` }, cache: 'no-store' });
  const payload = await response.json() as { status?: boolean; message?: string; data?: { status?: string; amount?: number } };
  if (!response.ok || !payload.status) throw new Error(payload.message || 'Paystack verification failed.');
  return { status: payload.data?.status ?? 'unknown', amount: Number(payload.data?.amount ?? 0) };
}

async function initializeFlutterwave(secretKey: string, input: { txRef: string; amountKobo: number; redirectUrl: string; email: string; name: string }): Promise<string> {
  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_ref: input.txRef, amount: input.amountKobo / 100, currency: 'NGN', redirect_url: input.redirectUrl, customer: { email: input.email, name: input.name } }),
    cache: 'no-store',
  });
  const payload = await response.json() as { status?: string; message?: string; data?: { link?: string } };
  if (!response.ok || payload.status !== 'success' || !payload.data?.link) throw new Error(payload.message || 'Flutterwave checkout could not be initialized.');
  return payload.data.link;
}

export type CreateOrderInput = {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  localGovernment: string;
  state: string;
  provider: 'paystack' | 'flutterwave';
  giftCardCode?: string;
  origin?: string;
};

export async function createOrderFromCart(userId: string, userEmail: string, input: CreateOrderInput): Promise<{ orderId: string; orderNumber: string; amountDueKobo: number; paymentUrl: string | null }> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const settings = await getStoreSettings();
  const cartRow = await getOrCreateCart(userId);
  const cartState = await getCartState(userId);
  if (!cartState.lines.length) throw new Error('Your cart is empty.');
  if (!input.fullName.trim() || !input.phone.trim() || !input.street.trim() || !input.state.trim()) throw new Error('Full name, phone, street, and state are required.');

  const quote = await quoteShipping(userId, input.state);
  if (!quote && settings.regionShippingEnabled) throw new Error('Delivery is not available for the selected state.');
  const shippingFeeKobo = quote ? quote.feeKobo : 0;

  const subtotalKobo = cartState.totals.subtotalKobo;
  const discountKobo = cartState.totals.discountKobo;
  const couponId = cartState.totals.couponCode ? cartRow.coupon_id : null;
  const couponCode = cartState.totals.couponCode;
  const totalKobo = Math.max(0, subtotalKobo - discountKobo + shippingFeeKobo);

  let giftCardId: string | null = null;
  let giftCardAppliedKobo = 0;
  if (input.giftCardCode && input.giftCardCode.trim()) {
    const giftCard = await validateGiftCard(input.giftCardCode);
    if (!giftCard.ok) throw new Error(giftCard.error);
    giftCardId = giftCard.giftCardId;
    giftCardAppliedKobo = Math.min(giftCard.balanceKobo, totalKobo);
  }
  const amountDueKobo = Math.max(0, totalKobo - giftCardAppliedKobo);

  // Pre-check stock before anything is written so a rejection never leaves a dangling order.
  const stockNeeds = new Map<string, number>();
  const stockTitles = new Map<string, string>();
  for (const line of cartState.lines) await collectStockNeeds(db, line.listingId, line.quantity, stockNeeds, stockTitles);
  if (settings.stockReservationEnabled) {
    for (const [listingId, needed] of stockNeeds) {
      const row = await db.prepare('SELECT stock_quantity FROM listings WHERE id = ? LIMIT 1').bind(listingId).first<{ stock_quantity: number }>();
      if (!row || Number(row.stock_quantity) < needed) throw new Error(`Insufficient stock for ${stockTitles.get(listingId) ?? 'an item in your order'}.`);
    }
  }

  let paymentUrl: string | null = null;
  const gateway = amountDueKobo > 0 ? await getPaymentGatewayConfig(input.provider) : null;
  if (gateway && (!gateway.enabled || !gateway.secretKey)) {
    throw new Error(input.provider === 'paystack' ? 'Paystack is not available right now.' : 'Flutterwave is not available right now.');
  }

  const orderNumber = await generateOrderNumber(db, settings.orderNumberPrefix);
  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();
  const shippingAddress = [input.fullName.trim(), input.phone.trim(), `${input.street.trim()}, ${input.city.trim()}`, `${input.localGovernment.trim()}, ${input.state.trim()}`, 'Nigeria'].join('\n');

  await db
    .prepare(
      `INSERT INTO orders (id, order_number, user_id, status, subtotal_kobo, discount_kobo, coupon_id, coupon_code, shipping_fee_kobo, shipping_zone_id, shipping_location_id, total_kobo, currency, payment_provider, shipping_address, dispute_window_hours, created_at, updated_at)
       VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(orderId, orderNumber, userId, subtotalKobo, discountKobo, couponId, couponCode, shippingFeeKobo, quote?.zoneId ?? null, quote?.locationId ?? null, totalKobo, settings.defaultCurrency || 'NGN', input.provider, shippingAddress, settings.disputeWindowHours, now, now)
    .run();
  await insertHistory(db, orderId, 'pending_payment', '', userId);

  for (const line of cartState.lines) {
    await db
      .prepare('INSERT INTO order_items (id, order_id, listing_id, listing_type, title, quantity, unit_price_kobo, total_price_kobo, selected_attributes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), orderId, line.listingId, line.listingType, line.title, line.quantity, line.unitPriceKobo, line.lineTotalKobo, JSON.stringify(line.selectedAttributes), now)
      .run();
  }

  if (settings.stockReservationEnabled) {
    for (const [listingId, needed] of stockNeeds) {
      if (needed <= 0) continue;
      await db.prepare('UPDATE listings SET stock_quantity = MAX(0, stock_quantity - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(needed, listingId).run();
      await db.prepare('INSERT INTO inventory_logs (id, listing_id, quantity_change, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), listingId, -needed, 'order_hold', userId, now).run();
    }
  }

  if (giftCardId && giftCardAppliedKobo > 0) {
    await db.prepare('UPDATE gift_cards SET balance_kobo = MAX(0, balance_kobo - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(giftCardAppliedKobo, giftCardId).run();
    await db.prepare('INSERT INTO gift_card_transactions (id, gift_card_id, order_id, amount_kobo, created_at) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), giftCardId, orderId, giftCardAppliedKobo, now).run();
  }

  if (amountDueKobo <= 0) {
    await finalizePaidOrder(orderId);
  } else {
    const baseUrl = (input.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? '').replace(/\/$/, '');
    const redirectUrl = baseUrl ? `${baseUrl}/checkout/success?order=${orderId}` : `/checkout/success?order=${orderId}`;
    const reference = `${orderNumber}-${crypto.randomUUID().slice(0, 8)}`;
    if (input.provider === 'paystack') {
      const checkout = gateway!.source === 'admin'
        ? await initializePaystackWithSecret(gateway!.secretKey, { email: userEmail, amountKobo: amountDueKobo, reference, callbackUrl: redirectUrl })
        : await initializeTransaction({ email: userEmail, amountKobo: amountDueKobo, reference, callbackUrl: redirectUrl });
      paymentUrl = checkout.authorizationUrl;
      await db.prepare('UPDATE orders SET payment_reference = ? WHERE id = ?').bind(checkout.reference, orderId).run();
    } else {
      paymentUrl = await initializeFlutterwave(gateway!.secretKey, { txRef: reference, amountKobo: amountDueKobo, redirectUrl, email: userEmail, name: input.fullName.trim() });
      await db.prepare('UPDATE orders SET payment_reference = ? WHERE id = ?').bind(reference, orderId).run();
    }
  }

  return { orderId, orderNumber, amountDueKobo, paymentUrl };
}

// Shared paid-transition helper. Safe to call for zero-amount orders and after payment verification.
export async function finalizePaidOrder(orderId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const order = await db
    .prepare("SELECT o.id, o.order_number, o.user_id, o.status, o.total_kobo, o.coupon_id, u.email AS user_email, COALESCE(NULLIF(u.display_name, ''), '') AS user_display_name FROM orders o LEFT JOIN users_profile u ON u.id = o.user_id WHERE o.id = ? LIMIT 1")
    .bind(orderId)
    .first<{ id: string; order_number: string; user_id: string; status: string; total_kobo: number; coupon_id: string | null; user_email: string | null; user_display_name: string }>();
  if (!order || order.status !== 'pending_payment') return;
  const now = new Date().toISOString();
  await db.prepare("UPDATE orders SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment'").bind(now, now, orderId).run();
  await insertHistory(db, orderId, 'paid', '', order.user_id);
  if (order.coupon_id) await db.prepare('UPDATE coupons SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(order.coupon_id).run();
  const settings = await getStoreSettings();
  if (settings.loyaltyPointsPerOrder > 0) {
    await db
      .prepare('INSERT INTO loyalty_accounts (user_id, points_balance, lifetime_points, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET points_balance = points_balance + excluded.points_balance, lifetime_points = lifetime_points + excluded.lifetime_points, updated_at = excluded.updated_at')
      .bind(order.user_id, settings.loyaltyPointsPerOrder, settings.loyaltyPointsPerOrder, now)
      .run();
    await db
      .prepare("INSERT INTO loyalty_transactions (id, user_id, points, transaction_type, order_id, description, created_at) VALUES (?, ?, ?, 'earn', ?, ?, ?)")
      .bind(crypto.randomUUID(), order.user_id, settings.loyaltyPointsPerOrder, orderId, `Order ${order.order_number}`, now)
      .run();
  }
  if (order.user_email) {
    const referral = await db
      .prepare("SELECT id FROM referrals WHERE referee_email = ? AND status IN ('pending','signed_up') AND reward_amount_kobo > 0 ORDER BY created_at ASC LIMIT 1")
      .bind(order.user_email)
      .first<{ id: string }>();
    if (referral) await db.prepare("UPDATE referrals SET status = 'rewarded', rewarded_at = ? WHERE id = ?").bind(now, referral.id).run();
  }
  await insertNotification(db, order.user_id, 'order', `Order ${order.order_number} confirmed`, `Your order ${order.order_number} is confirmed. Thank you for shopping with DTECHNURSE STORE.`);
  await db.prepare("UPDATE carts SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status = 'active'").bind(order.user_id).run();
  const items = await db.prepare('SELECT title, quantity FROM order_items WHERE order_id = ?').bind(orderId).all<{ title: string; quantity: number }>();
  if (order.user_email) {
    await sendOrderEmails({ id: orderId, orderNumber: order.order_number, status: 'paid', totalKobo: Number(order.total_kobo), items: items.results ?? [], userEmail: order.user_email, userDisplayName: order.user_display_name || undefined });
  }
}

export async function verifyAndFinalizeOrder(orderId: string): Promise<{ status: OrderStatus }> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const order = await db.prepare('SELECT id, status, payment_provider, payment_reference, total_kobo FROM orders WHERE id = ? LIMIT 1').bind(orderId).first<{ id: string; status: string; payment_provider: string | null; payment_reference: string | null; total_kobo: number }>();
  if (!order) throw new Error('Order not found.');
  if (order.status !== 'pending_payment') return { status: asOrderStatus(order.status) };
  if (!order.payment_reference) return { status: 'pending_payment' };
  const amountDueKobo = Number(order.total_kobo) - (await sumGiftCardApplied(db, orderId));
  let verified = false;
  if (order.payment_provider === 'flutterwave') {
    const gateway = await getPaymentGatewayConfig('flutterwave');
    if (gateway.secretKey) {
      try {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(order.payment_reference)}`, { headers: { Authorization: `Bearer ${gateway.secretKey}` }, cache: 'no-store' });
        const payload = await response.json() as { status?: string; data?: { status?: string; amount?: number } };
        if (payload.data?.status === 'successful' && Number(payload.data.amount ?? 0) * 100 >= amountDueKobo) verified = true;
      } catch (error) {
        console.error('Flutterwave verification failed.', error);
      }
    }
  } else {
    const gateway = await getPaymentGatewayConfig('paystack');
    if (gateway.secretKey) {
      try {
        const result = gateway.source === 'admin' ? await verifyPaystackWithSecret(gateway.secretKey, order.payment_reference) : await verifyTransaction(order.payment_reference);
        if (result.status === 'success' && result.amount >= amountDueKobo) verified = true;
      } catch (error) {
        console.error('Paystack verification failed.', error);
      }
    }
  }
  if (!verified) return { status: 'pending_payment' };
  await finalizePaidOrder(orderId);
  return { status: 'paid' };
}

export async function listUserOrders(userId: string): Promise<OrderSummary[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT o.id, o.order_number, o.status, o.total_kobo, o.currency, o.created_at, o.payment_provider,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
        (SELECT COUNT(*) FROM order_items oi JOIN listings l ON l.id = oi.listing_id WHERE oi.order_id = o.id AND l.is_digital = 1) AS digital_count
       FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC LIMIT 100`
    )
    .bind(userId)
    .all<{ id: string; order_number: string; status: string; total_kobo: number; currency: string; created_at: string; payment_provider: string | null; item_count: number; digital_count: number }>();
  return (rows.results ?? []).map(row => ({
    id: row.id,
    orderNumber: row.order_number,
    status: asOrderStatus(row.status),
    totalKobo: Number(row.total_kobo),
    currency: row.currency,
    createdAt: row.created_at,
    itemCount: Number(row.item_count ?? 0),
    paymentProvider: row.payment_provider,
    containsDigital: Number(row.digital_count ?? 0) > 0,
  }));
}

type OrderDbRow = {
  id: string; order_number: string; user_id: string; status: string;
  subtotal_kobo: number; discount_kobo: number; coupon_code: string | null;
  shipping_fee_kobo: number; total_kobo: number; currency: string;
  payment_provider: string | null; shipping_address: string; dispute_window_hours: number;
  paid_at: string | null; shipped_at: string | null; finished_at: string | null; created_at: string;
  zone_name: string | null; state_name: string | null;
};

async function loadOrderDetail(orderId: string, userId: string | null): Promise<{ detail: OrderDetail; userId: string } | null> {
  const db = getDatabase();
  if (!db) return null;
  const orderRow = await db
    .prepare(
      `SELECT o.id, o.order_number, o.user_id, o.status, o.subtotal_kobo, o.discount_kobo, o.coupon_code, o.shipping_fee_kobo, o.total_kobo, o.currency,
              o.payment_provider, o.shipping_address, o.dispute_window_hours, o.paid_at, o.shipped_at, o.finished_at, o.created_at,
              z.name AS zone_name, loc.name AS state_name
       FROM orders o LEFT JOIN shipping_zones z ON z.id = o.shipping_zone_id LEFT JOIN shipping_locations loc ON loc.id = o.shipping_location_id
       WHERE o.id = ?${userId ? ' AND o.user_id = ?' : ''} LIMIT 1`
    )
    .bind(...(userId ? [orderId, userId] : [orderId]))
    .first<OrderDbRow>();
  if (!orderRow) return null;

  // Auto-finish shipped orders once the configured window elapses.
  const settings = await getStoreSettings();
  if (orderRow.status === 'shipped' && orderRow.shipped_at) {
    const dueAt = new Date(orderRow.shipped_at).getTime() + settings.orderAutoFinishDays * 86400000;
    if (Date.now() > dueAt) {
      const now = new Date().toISOString();
      await db.prepare("UPDATE orders SET status = 'finished', finished_at = ?, updated_at = ? WHERE id = ? AND status = 'shipped'").bind(now, now, orderId).run();
      await insertHistory(db, orderId, 'finished', 'auto-finished', null);
      orderRow.status = 'finished';
      orderRow.finished_at = now;
    }
  }
  const status = asOrderStatus(orderRow.status);
  const downloadableStatuses: OrderStatus[] = ['paid', 'shipped', 'finished'];

  const itemRows = await db
    .prepare(
      `SELECT oi.id, oi.listing_id, oi.listing_type, oi.title, oi.quantity, oi.unit_price_kobo, oi.total_price_kobo, oi.selected_attributes,
              l.slug AS listing_slug, l.is_digital,
              (SELECT li.object_key FROM listing_images li WHERE li.listing_id = oi.listing_id ORDER BY li.is_primary DESC, li.sort_order ASC LIMIT 1) AS image_key,
              (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = oi.listing_id AND r.user_id = o.user_id AND r.status IN ('pending','approved')) AS review_count
       FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN listings l ON l.id = oi.listing_id
       WHERE oi.order_id = ? ORDER BY oi.created_at ASC, oi.rowid ASC`
    )
    .bind(orderId)
    .all<{ id: string; listing_id: string | null; listing_type: string; title: string; quantity: number; unit_price_kobo: number; total_price_kobo: number; selected_attributes: string; listing_slug: string | null; is_digital: number | null; image_key: string | null; review_count: number }>();

  const items: OrderItemRecord[] = (itemRows.results ?? []).map(row => {
    const isDigital = row.is_digital === 1;
    return {
      id: row.id,
      listingId: row.listing_id,
      slug: row.listing_slug ?? '#',
      title: row.title,
      listingType: row.listing_type === 'bundle' ? 'bundle' : 'single',
      quantity: Number(row.quantity),
      unitPriceKobo: Number(row.unit_price_kobo),
      totalPriceKobo: Number(row.total_price_kobo),
      selectedAttributes: parseSelectedAttributes(row.selected_attributes),
      imageUrl: row.image_key ? listingImageUrl(row.image_key) : '/dtechnurse-logo.jpg',
      isDigital,
      downloadable: isDigital && downloadableStatuses.includes(status),
      reviewed: Number(row.review_count ?? 0) > 0,
    };
  });

  const historyRows = await db.prepare('SELECT id, status, note, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC, rowid ASC').bind(orderId).all<{ id: string; status: string; note: string; created_at: string }>();
  const history: OrderEvent[] = (historyRows.results ?? []).map(row => ({ id: row.id, status: asOrderStatus(row.status), note: row.note, createdAt: row.created_at }));

  const dispute = await db.prepare('SELECT id, dispute_type, reason, status FROM disputes WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').bind(orderId).first<{ id: string; dispute_type: string; reason: string; status: string }>();
  const refundRows = await db.prepare('SELECT amount_kobo, provider, reference, note, created_at FROM refunds WHERE order_id = ? ORDER BY created_at ASC, rowid ASC').bind(orderId).all<{ amount_kobo: number; provider: string; reference: string; note: string; created_at: string }>();

  const detail: OrderDetail = {
    id: orderRow.id,
    orderNumber: orderRow.order_number,
    status,
    totalKobo: Number(orderRow.total_kobo),
    currency: orderRow.currency,
    createdAt: orderRow.created_at,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    paymentProvider: orderRow.payment_provider,
    containsDigital: items.some(item => item.isDigital),
    subtotalKobo: Number(orderRow.subtotal_kobo),
    discountKobo: Number(orderRow.discount_kobo),
    couponCode: orderRow.coupon_code,
    shippingFeeKobo: Number(orderRow.shipping_fee_kobo),
    shippingZoneName: orderRow.zone_name,
    shippingStateName: orderRow.state_name,
    shippingAddress: orderRow.shipping_address,
    disputeWindowHours: Number(orderRow.dispute_window_hours),
    paidAt: orderRow.paid_at,
    shippedAt: orderRow.shipped_at,
    finishedAt: orderRow.finished_at,
    items,
    history,
    dispute: dispute ? { id: dispute.id, disputeType: dispute.dispute_type, reason: dispute.reason, status: dispute.status } : null,
    refunds: (refundRows.results ?? []).map(refund => ({ amountKobo: Number(refund.amount_kobo), provider: refund.provider, reference: refund.reference, note: refund.note, createdAt: refund.created_at })),
  };
  return { detail, userId: orderRow.user_id };
}

export async function getOrderDetail(userId: string, orderId: string): Promise<OrderDetail | null> {
  const loaded = await loadOrderDetail(orderId, userId);
  return loaded?.detail ?? null;
}

export async function getOrderForAdmin(orderId: string): Promise<OrderDetail & { buyerEmail: string; buyerDisplayName: string } | null> {
  const db = getDatabase();
  if (!db) return null;
  const loaded = await loadOrderDetail(orderId, null);
  if (!loaded) return null;
  const buyer = await db.prepare('SELECT email, COALESCE(NULLIF(display_name, ""), "") AS display_name FROM users_profile WHERE id = ? LIMIT 1').bind(loaded.userId).first<{ email: string; display_name: string }>();
  return { ...loaded.detail, buyerEmail: buyer?.email ?? '', buyerDisplayName: buyer?.display_name ?? '' };
}

export async function cancelOrder(userId: string, orderId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const order = await db.prepare('SELECT id, order_number, user_id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1').bind(orderId, userId).first<{ id: string; order_number: string; user_id: string; status: string }>();
  if (!order) return { ok: false, error: 'Order not found.' };
  if (order.status !== 'pending_payment') return { ok: false, error: 'Only unpaid orders can be cancelled.' };
  const settings = await getStoreSettings();
  const now = new Date().toISOString();
  await db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").bind(now, orderId).run();
  await insertHistory(db, orderId, 'cancelled', 'Cancelled by customer', userId);
  if (settings.stockReservationEnabled) await restockForOrder(db, orderId, 'cancel_restock', userId);
  const appliedRows = await db.prepare('SELECT gift_card_id, COALESCE(SUM(amount_kobo), 0) AS applied FROM gift_card_transactions WHERE order_id = ? GROUP BY gift_card_id').bind(orderId).all<{ gift_card_id: string; applied: number }>();
  for (const applied of appliedRows.results ?? []) {
    await db.prepare("UPDATE gift_cards SET balance_kobo = balance_kobo + ?, status = CASE WHEN status = 'redeemed' THEN 'active' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(Number(applied.applied), applied.gift_card_id).run();
  }
  await db.prepare('DELETE FROM gift_card_transactions WHERE order_id = ?').bind(orderId).run();
  await insertNotification(db, userId, 'order', `Order ${order.order_number} cancelled`, `Your order ${order.order_number} has been cancelled.`);
  return { ok: true };
}

export async function fileDispute(userId: string, orderId: string, input: { disputeType: 'refund' | 'exchange'; reason: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const order = await db.prepare('SELECT id, order_number, user_id, status, finished_at, dispute_window_hours FROM orders WHERE id = ? AND user_id = ? LIMIT 1').bind(orderId, userId).first<{ id: string; order_number: string; user_id: string; status: string; finished_at: string | null; dispute_window_hours: number }>();
  if (!order) return { ok: false, error: 'Order not found.' };
  if (!['paid', 'shipped', 'finished'].includes(order.status)) return { ok: false, error: 'Disputes can only be opened for paid, shipped, or finished orders.' };
  if (order.status === 'finished' && order.finished_at) {
    const deadline = new Date(order.finished_at).getTime() + Number(order.dispute_window_hours) * 3600000;
    if (Date.now() > deadline) return { ok: false, error: 'The dispute window for this order has closed.' };
  }
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: 'Describe the issue with your order.' };
  const now = new Date().toISOString();
  await db.prepare("INSERT INTO disputes (id, order_id, user_id, dispute_type, reason, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)").bind(crypto.randomUUID(), orderId, userId, input.disputeType === 'exchange' ? 'exchange' : 'refund', reason.slice(0, 2000), now).run();
  await db.prepare("UPDATE orders SET status = 'disputed', updated_at = ? WHERE id = ?").bind(now, orderId).run();
  await insertHistory(db, orderId, 'disputed', 'Dispute opened by customer', userId);
  return { ok: true };
}

export async function submitReview(userId: string, orderId: string, input: { listingId: string; rating: number; title: string; body: string }): Promise<{ ok: true; status: 'approved' | 'pending' } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const rating = Math.floor(Number(input.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Choose a rating between 1 and 5.' };
  const order = await db.prepare('SELECT id, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1').bind(orderId, userId).first<{ id: string; status: string }>();
  if (!order) return { ok: false, error: 'Order not found.' };
  if (!['paid', 'shipped', 'finished'].includes(order.status)) return { ok: false, error: 'You can review products after your order is paid.' };
  const item = await db.prepare('SELECT id FROM order_items WHERE order_id = ? AND listing_id = ? LIMIT 1').bind(orderId, input.listingId).first<{ id: string }>();
  if (!item) return { ok: false, error: 'That product is not part of this order.' };
  const existing = await db.prepare('SELECT id FROM reviews WHERE listing_id = ? AND user_id = ? LIMIT 1').bind(input.listingId, userId).first<{ id: string }>();
  if (existing) return { ok: false, error: 'You have already reviewed this product.' };
  const settings = await getStoreSettings();
  const status = settings.reviewsAutoApprove ? 'approved' : 'pending';
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO reviews (id, listing_id, user_id, order_id, rating, title, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), input.listingId, userId, orderId, rating, input.title.trim().slice(0, 160), input.body.trim().slice(0, 4000), status, now).run();
  return { ok: true, status };
}

export async function adminUpdateOrderStatus(orderId: string, status: OrderStatus, note: string, adminId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  if (!(ORDER_STATUS_VALUES as readonly string[]).includes(status)) return { ok: false, error: 'Unknown order status.' };
  const order = await db.prepare('SELECT id, order_number, user_id, status, paid_at, shipped_at, finished_at, total_kobo FROM orders WHERE id = ? LIMIT 1').bind(orderId).first<{ id: string; order_number: string; user_id: string; status: string; paid_at: string | null; shipped_at: string | null; finished_at: string | null; total_kobo: number }>();
  if (!order) return { ok: false, error: 'Order not found.' };
  if (status === 'pending_payment' && order.status !== 'pending_payment') return { ok: false, error: 'An order cannot move back to pending payment.' };
  const now = new Date().toISOString();
  const paidAt = status === 'paid' ? order.paid_at ?? now : order.paid_at;
  const shippedAt = status === 'shipped' ? order.shipped_at ?? now : order.shipped_at;
  const finishedAt = status === 'finished' ? order.finished_at ?? now : order.finished_at;
  await db.prepare('UPDATE orders SET status = ?, paid_at = ?, shipped_at = ?, finished_at = ?, updated_at = ? WHERE id = ?').bind(status, paidAt, shippedAt, finishedAt, now, orderId).run();
  await insertHistory(db, orderId, status, note, adminId);
  if ((status === 'cancelled' || status === 'refunded') && ['paid', 'shipped', 'finished'].includes(order.status)) {
    await restockForOrder(db, orderId, `${status}_restock`, adminId);
  }
  const label = ORDER_STATUS_LABELS[status].toLowerCase();
  await insertNotification(db, order.user_id, 'order', `Order ${order.order_number} update`, `Your order ${order.order_number} is now ${label}.`);
  if (status === 'shipped' || status === 'finished' || status === 'refunded') {
    const items = await db.prepare('SELECT title, quantity FROM order_items WHERE order_id = ?').bind(orderId).all<{ title: string; quantity: number }>();
    const buyer = await db.prepare('SELECT email, COALESCE(NULLIF(display_name, ""), "") AS display_name FROM users_profile WHERE id = ? LIMIT 1').bind(order.user_id).first<{ email: string; display_name: string }>();
    if (buyer?.email) {
      await sendOrderEmails({ id: orderId, orderNumber: order.order_number, status, totalKobo: Number(order.total_kobo), items: items.results ?? [], userEmail: buyer.email, userDisplayName: buyer.display_name || undefined });
    }
  }
  return { ok: true };
}

export async function recordRefund(orderId: string, input: { amountKobo: number; provider: 'paystack' | 'flutterwave' | 'other'; reference: string; note: string; disputeId?: string }, adminId: string): Promise<{ ok: true; refundedTotalKobo: number } | { ok: false; error: string }> {
  const db = getDatabase();
  if (!db) return { ok: false, error: 'Database is not configured.' };
  const amountKobo = Math.floor(Number(input.amountKobo));
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) return { ok: false, error: 'Refund amount must be greater than zero.' };
  const order = await db.prepare('SELECT id, total_kobo FROM orders WHERE id = ? LIMIT 1').bind(orderId).first<{ id: string; total_kobo: number }>();
  if (!order) return { ok: false, error: 'Order not found.' };
  if (amountKobo > Number(order.total_kobo)) return { ok: false, error: 'Refund amount cannot exceed the order total.' };
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO refunds (id, order_id, dispute_id, amount_kobo, provider, reference, note, refunded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), orderId, input.disputeId || null, amountKobo, input.provider, input.reference ?? '', input.note ?? '', adminId, now)
    .run();
  const totalRow = await db.prepare('SELECT COALESCE(SUM(amount_kobo), 0) AS refunded FROM refunds WHERE order_id = ?').bind(orderId).first<{ refunded: number }>();
  const refundedTotalKobo = Number(totalRow?.refunded ?? 0);
  if (refundedTotalKobo >= Number(order.total_kobo)) {
    await db.prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?").bind(now, orderId).run();
    await insertHistory(db, orderId, 'refunded', input.note ?? 'Refund recorded', adminId);
  }
  if (input.disputeId) {
    await db.prepare("UPDATE disputes SET status = 'resolved', resolution_note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?").bind(input.note ?? '', adminId, now, input.disputeId).run();
  }
  return { ok: true, refundedTotalKobo };
}
