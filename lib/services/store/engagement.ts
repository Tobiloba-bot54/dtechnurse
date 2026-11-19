
import { getDatabase, type SqlDatabase } from '@/lib/server/db';
import { getStoreSettings } from './settings';
import { hydrateListingSummaries, LISTING_SUMMARY_FIELDS, type ListingBaseRow } from './catalog';
import { ORDER_STATUS_VALUES, type NotificationRecord, type OrderStatus, type OrderSummary, type RewardsOverview, type WishlistItem } from './types';

function asOrderStatus(value: string): OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value) ? (value as OrderStatus) : 'pending_payment';
}

export async function getWishlist(userId: string): Promise<WishlistItem[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT w.id AS wishlist_id, w.created_at AS added_at, ${LISTING_SUMMARY_FIELDS}
       FROM wishlists w JOIN listings l ON l.id = w.listing_id LEFT JOIN store_categories c ON c.id = l.category_id
       WHERE w.user_id = ? AND l.status = 'published' ORDER BY w.created_at DESC LIMIT 100`
    )
    .bind(userId)
    .all<ListingBaseRow & { wishlist_id: string; added_at: string }>();
  const summaries = await hydrateListingSummaries(rows.results ?? []);
  return (rows.results ?? []).map((row, index) => ({ id: row.wishlist_id, addedAt: row.added_at, listing: summaries[index] }));
}

export async function toggleWishlist(userId: string, listingId: string): Promise<{ added: boolean }> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const existing = await db.prepare('SELECT id FROM wishlists WHERE user_id = ? AND listing_id = ? LIMIT 1').bind(userId, listingId).first<{ id: string }>();
  if (existing) {
    await db.prepare('DELETE FROM wishlists WHERE id = ?').bind(existing.id).run();
    return { added: false };
  }
  await db.prepare('INSERT INTO wishlists (id, user_id, listing_id) VALUES (?, ?, ?)').bind(crypto.randomUUID(), userId, listingId).run();
  return { added: true };
}

export type AdminReviewRecord = {
  id: string;
  listingId: string;
  listingTitle: string;
  userId: string;
  authorName: string;
  userEmail: string;
  orderId: string | null;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  moderatedAt: string | null;
};

export async function listReviews(status?: string): Promise<AdminReviewRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT r.id, r.listing_id, COALESCE(l.title, '') AS listing_title, r.user_id, COALESCE(NULLIF(u.display_name, ''), 'Customer') AS author_name, COALESCE(u.email, '') AS user_email,
              r.order_id, r.rating, r.title, r.body, r.status, r.created_at, r.moderated_at
       FROM reviews r LEFT JOIN listings l ON l.id = r.listing_id LEFT JOIN users_profile u ON u.id = r.user_id
       ${status ? 'WHERE r.status = ?' : ''} ORDER BY r.created_at DESC LIMIT 200`
    )
    .bind(...(status ? [status] : []))
    .all<{ id: string; listing_id: string; listing_title: string; user_id: string; author_name: string; user_email: string; order_id: string | null; rating: number; title: string; body: string; status: string; created_at: string; moderated_at: string | null }>();
  return (rows.results ?? []).map(row => ({
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    userId: row.user_id,
    authorName: row.author_name,
    userEmail: row.user_email,
    orderId: row.order_id,
    rating: Number(row.rating),
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    moderatedAt: row.moderated_at,
  }));
}

export async function moderateReview(id: string, status: 'approved' | 'rejected', adminId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const review = await db.prepare('SELECT id, user_id FROM reviews WHERE id = ? LIMIT 1').bind(id).first<{ id: string; user_id: string }>();
  if (!review) throw new Error('Review not found.');
  const now = new Date().toISOString();
  await db.prepare('UPDATE reviews SET status = ?, moderated_by = ?, moderated_at = ? WHERE id = ?').bind(status, adminId, now, id).run();
  if (status === 'approved') {
    await insertNotification(db, review.user_id, 'review', 'Your review was approved', 'Your review was approved and is now visible on the product page.');
  }
}

export type AdminDisputeRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  disputeType: string;
  reason: string;
  status: string;
  resolutionNote: string;
  createdAt: string;
  resolvedAt: string | null;
};

export async function listDisputes(status?: string): Promise<AdminDisputeRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT d.id, d.order_id, o.order_number, d.user_id, COALESCE(u.email, '') AS user_email, d.dispute_type, d.reason, d.status, d.resolution_note, d.created_at, d.resolved_at
       FROM disputes d JOIN orders o ON o.id = d.order_id LEFT JOIN users_profile u ON u.id = d.user_id
       ${status ? 'WHERE d.status = ?' : ''} ORDER BY d.created_at DESC LIMIT 200`
    )
    .bind(...(status ? [status] : []))
    .all<{ id: string; order_id: string; order_number: string; user_id: string; user_email: string; dispute_type: string; reason: string; status: string; resolution_note: string; created_at: string; resolved_at: string | null }>();
  return (rows.results ?? []).map(row => ({
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    userId: row.user_id,
    userEmail: row.user_email,
    disputeType: row.dispute_type,
    reason: row.reason,
    status: row.status,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }));
}

export async function resolveDispute(id: string, input: { status: 'resolved' | 'rejected'; resolutionNote: string }, adminId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const dispute = await db.prepare('SELECT id FROM disputes WHERE id = ? LIMIT 1').bind(id).first<{ id: string }>();
  if (!dispute) throw new Error('Dispute not found.');
  const now = new Date().toISOString();
  await db.prepare('UPDATE disputes SET status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?').bind(input.status, input.resolutionNote?.slice(0, 2000) ?? '', adminId, now, id).run();
}

async function insertNotification(db: SqlDatabase, userId: string, type: string, title: string, body: string): Promise<void> {
  await db.prepare("INSERT INTO notifications (id, user_id, channel, type, title, body, data, created_at) VALUES (?, ?, 'in_app', ?, ?, ?, '{}', ?)").bind(crypto.randomUUID(), userId, type, title, body, new Date().toISOString()).run();
}

export async function getRewardsOverview(userId: string): Promise<RewardsOverview> {
  const settings = await getStoreSettings();
  const referralCode = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const db = getDatabase();
  if (!db) {
    return { pointsBalance: 0, lifetimePoints: 0, loyaltyTransactions: [], referralCode, referralRewardAmountKobo: settings.referralRewardAmountKobo, referralRewardType: settings.referralRewardType, referrals: [], giftCards: [] };
  }
  const account = await db.prepare('SELECT points_balance, lifetime_points FROM loyalty_accounts WHERE user_id = ? LIMIT 1').bind(userId).first<{ points_balance: number; lifetime_points: number }>();
  const loyaltyRows = await db.prepare('SELECT points, transaction_type, description, created_at FROM loyalty_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(userId).all<{ points: number; transaction_type: string; description: string; created_at: string }>();
  const referralRows = await db.prepare('SELECT referee_email, status, reward_amount_kobo, created_at FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC LIMIT 20').bind(userId).all<{ referee_email: string; status: string; reward_amount_kobo: number; created_at: string }>();
  const giftCardRows = await db.prepare('SELECT code, initial_amount_kobo, balance_kobo, status, expires_at FROM gift_cards WHERE purchased_by = ? ORDER BY created_at DESC LIMIT 50').bind(userId).all<{ code: string; initial_amount_kobo: number; balance_kobo: number; status: string; expires_at: string | null }>();
  return {
    pointsBalance: Number(account?.points_balance ?? 0),
    lifetimePoints: Number(account?.lifetime_points ?? 0),
    loyaltyTransactions: (loyaltyRows.results ?? []).map(row => ({ points: Number(row.points), transactionType: row.transaction_type, description: row.description, createdAt: row.created_at })),
    referralCode,
    referralRewardAmountKobo: settings.referralRewardAmountKobo,
    referralRewardType: settings.referralRewardType,
    referrals: (referralRows.results ?? []).map(row => ({ refereeEmail: row.referee_email, status: row.status, rewardAmountKobo: Number(row.reward_amount_kobo), createdAt: row.created_at })),
    giftCards: (giftCardRows.results ?? []).map(row => ({ code: row.code, initialAmountKobo: Number(row.initial_amount_kobo), balanceKobo: Number(row.balance_kobo), status: row.status, expiresAt: row.expires_at })),
  };
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const rows = await db.prepare('SELECT id, type, title, body, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').bind(userId, safeLimit).all<{ id: string; type: string; title: string; body: string; read_at: string | null; created_at: string }>();
  return (rows.results ?? []).map(row => ({ id: row.id, type: row.type, title: row.title, body: row.body, readAt: row.read_at, createdAt: row.created_at }));
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(new Date().toISOString(), userId).run();
}

const PAID_ISH_STATUSES = "('paid','shipped','finished','refunded','exchanged')";

export type StoreAnalytics = {
  revenueKobo: number;
  ordersCount: Record<OrderStatus, number>;
  topProducts: Array<{ listingId: string | null; title: string; quantity: number; revenueKobo: number }>;
  lowStock: Array<{ id: string; title: string; slug: string; stockQuantity: number; lowStockThreshold: number }>;
  recentOrders: OrderSummary[];
  inventoryLogs: Array<{ id: string; listingId: string; listingTitle: string; quantityChange: number; reason: string; createdBy: string | null; createdAt: string }>;
};

export async function getStoreAnalytics(): Promise<StoreAnalytics> {
  const db = getDatabase();
  if (!db) {
    return { revenueKobo: 0, ordersCount: Object.fromEntries(ORDER_STATUS_VALUES.map(status => [status, 0])) as Record<OrderStatus, number>, topProducts: [], lowStock: [], recentOrders: [], inventoryLogs: [] };
  }
  const revenueRow = await db.prepare(`SELECT COALESCE(SUM(total_kobo), 0) AS revenue FROM orders WHERE status IN ${PAID_ISH_STATUSES}`).first<{ revenue: number }>();
  const countRows = await db.prepare('SELECT status, COUNT(*) AS total FROM orders GROUP BY status').all<{ status: string; total: number }>();
  const ordersCount = Object.fromEntries(ORDER_STATUS_VALUES.map(status => [status, 0])) as Record<OrderStatus, number>;
  for (const row of countRows.results ?? []) ordersCount[asOrderStatus(row.status)] = Number(row.total);
  const topRows = await db
    .prepare(
      `SELECT oi.listing_id, oi.title, SUM(oi.quantity) AS quantity, SUM(oi.total_price_kobo) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status IN ${PAID_ISH_STATUSES}
       GROUP BY oi.listing_id, oi.title ORDER BY quantity DESC LIMIT 5`
    )
    .all<{ listing_id: string | null; title: string; quantity: number; revenue: number }>();
  const lowStockRows = await db
    .prepare("SELECT id, title, slug, stock_quantity, low_stock_threshold FROM listings WHERE status = 'published' AND track_stock = 1 AND stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC LIMIT 10")
    .all<{ id: string; title: string; slug: string; stock_quantity: number; low_stock_threshold: number }>();
  const recentRows = await db
    .prepare(
      `SELECT o.id, o.order_number, o.status, o.total_kobo, o.currency, o.created_at, o.payment_provider,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
        (SELECT COUNT(*) FROM order_items oi JOIN listings l ON l.id = oi.listing_id WHERE oi.order_id = o.id AND l.is_digital = 1) AS digital_count
       FROM orders o ORDER BY o.created_at DESC LIMIT 8`
    )
    .all<{ id: string; order_number: string; status: string; total_kobo: number; currency: string; created_at: string; payment_provider: string | null; item_count: number; digital_count: number }>();
  const inventoryRows = await db
    .prepare('SELECT il.id, il.listing_id, COALESCE(l.title, "") AS listing_title, il.quantity_change, il.reason, il.created_by, il.created_at FROM inventory_logs il LEFT JOIN listings l ON l.id = il.listing_id ORDER BY il.created_at DESC, il.rowid DESC LIMIT 20')
    .all<{ id: string; listing_id: string; listing_title: string; quantity_change: number; reason: string; created_by: string | null; created_at: string }>();
  return {
    revenueKobo: Number(revenueRow?.revenue ?? 0),
    ordersCount,
    topProducts: (topRows.results ?? []).map(row => ({ listingId: row.listing_id, title: row.title, quantity: Number(row.quantity), revenueKobo: Number(row.revenue) })),
    lowStock: (lowStockRows.results ?? []).map(row => ({ id: row.id, title: row.title, slug: row.slug, stockQuantity: Number(row.stock_quantity), lowStockThreshold: Number(row.low_stock_threshold) })),
    recentOrders: (recentRows.results ?? []).map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      status: asOrderStatus(row.status),
      totalKobo: Number(row.total_kobo),
      currency: row.currency,
      createdAt: row.created_at,
      itemCount: Number(row.item_count ?? 0),
      paymentProvider: row.payment_provider,
      containsDigital: Number(row.digital_count ?? 0) > 0,
    })),
    inventoryLogs: (inventoryRows.results ?? []).map(row => ({ id: row.id, listingId: row.listing_id, listingTitle: row.listing_title, quantityChange: Number(row.quantity_change), reason: row.reason, createdBy: row.created_by, createdAt: row.created_at })),
  };
}
