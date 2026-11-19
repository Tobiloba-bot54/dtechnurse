// File: app/api/admin/store/orders/route.ts
// Staff order browsing with buyer details, search, and pagination.
import { requireStoreStaff } from '@/lib/server/store-auth';
import { jsonError } from '@/lib/server/validation';
import { ORDER_STATUS_VALUES, type OrderStatus } from '@/lib/services/store/types';

export const runtime = 'nodejs';

type AdminOrderRow = {
  id: string;
  order_number: string;
  status: string;
  total_kobo: number;
  currency: string;
  created_at: string;
  payment_provider: string | null;
  item_count: number;
  digital_count: number;
  buyer_email: string;
  buyer_name: string;
};

function asOrderStatus(value: string): OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value) ? (value as OrderStatus) : 'pending_payment';
}

export async function GET(request: Request) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const statusParam = (url.searchParams.get('status') ?? '').trim();
  const status = (ORDER_STATUS_VALUES as readonly string[]).includes(statusParam) ? statusParam : '';
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
  const perPage = 20;
  const where: string[] = [];
  const values: unknown[] = [];
  if (status) { where.push('o.status = ?'); values.push(status); }
  if (q) { where.push('lower(o.order_number) LIKE lower(?)'); values.push(`%${q}%`); }
  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  try {
    const totalRow = await auth.db.prepare(`SELECT COUNT(*) AS total FROM orders o${whereSql}`).bind(...values).first<{ total: number }>();
    const total = Number(totalRow?.total ?? 0);
    const rows = await auth.db
      .prepare(
        `SELECT o.id, o.order_number, o.status, o.total_kobo, o.currency, o.created_at, o.payment_provider,
                (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                (SELECT COUNT(*) FROM order_items oi JOIN listings l ON l.id = oi.listing_id WHERE oi.order_id = o.id AND l.is_digital = 1) AS digital_count,
                COALESCE(u.email, '') AS buyer_email, COALESCE(NULLIF(u.display_name, ''), '') AS buyer_name
         FROM orders o LEFT JOIN users_profile u ON u.id = o.user_id${whereSql}
         ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`
      )
      .bind(...values, perPage, (page - 1) * perPage)
      .all<AdminOrderRow>();
    const orders = (rows.results ?? []).map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      status: asOrderStatus(row.status),
      totalKobo: Number(row.total_kobo),
      currency: row.currency,
      createdAt: row.created_at,
      itemCount: Number(row.item_count ?? 0),
      paymentProvider: row.payment_provider,
      containsDigital: Number(row.digital_count ?? 0) > 0,
      buyerEmail: row.buyer_email,
      buyerName: row.buyer_name,
    }));
    return Response.json({ orders, total, page, pages: Math.max(1, Math.ceil(total / perPage)) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Orders could not be loaded.', 503);
  }
}
