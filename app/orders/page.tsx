import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Package } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { listUserOrders } from '@/lib/services/store/orders';
import { listNotifications } from '@/lib/services/store/engagement';
import { NotificationMarker } from '@/components/store/notification-marker';
import { formatNaira, ORDER_STATUS_LABELS } from '@/lib/services/store/types';

export const metadata = { title: 'My orders | DTECHNURSE' };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function OrdersPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/orders')}`);
  const [orders, notifications] = await Promise.all([
    listUserOrders(data.user.id).catch(() => []),
    listNotifications(data.user.id, 10).catch(() => []),
  ]);
  const hasUnread = notifications.some(notification => !notification.readAt);
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>My orders</h1>
      <p className="lead">Track deliveries, download digital purchases, and manage every order in one place.</p>
      {hasUnread && <NotificationMarker />}
      {notifications.length > 0 && (
        <section aria-labelledby="notifications-heading">
          <h2 id="notifications-heading">Notifications</h2>
          <ul className="notifications-list">
            {notifications.map(notification => (
              <li key={notification.id} className={notification.readAt ? 'notification-item' : 'notification-item unread'}>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                {formatDate(notification.createdAt) && <small>{formatDate(notification.createdAt)}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading">Order history</h2>
        {orders.length === 0 ? (
          <div className="empty-state">
            <Package className="empty-state-icon" aria-hidden="true" />
            <h3>No orders yet</h3>
            <p>When you place an order it will appear here with its payment and delivery status.</p>
            <Link className="button" href="/store">Start shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`} className="order-row">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <small>{formatDate(order.createdAt)} · {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}{order.containsDigital ? ' · includes digital' : ''}</small>
                </div>
                <div>
                  <span>{formatNaira(order.totalKobo)}</span>
                  <span className={`status-pill ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span>
                </div>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
