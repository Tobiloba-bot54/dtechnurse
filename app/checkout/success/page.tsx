import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { getOrderDetail } from '@/lib/services/store/orders';
import { OrderVerify } from '@/components/store/order-verify';
import { formatNaira, ORDER_STATUS_LABELS } from '@/lib/services/store/types';

export const metadata = {
  title: 'Order confirmed | DTECHNURSE',
  description: 'Your DTECHNURSE store order has been received. Verify your payment and track the order.',
};

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/orders')}`);
  const params = await searchParams;
  const orderId = typeof params.order === 'string' ? params.order : '';
  const order = orderId ? await getOrderDetail(data.user.id, orderId).catch(() => null) : null;

  if (!order) {
    return (
      <main className="content-page store-shell">
        <span className="eyebrow">DTECHNURSE STORE</span>
        <h1>Thank you for your order</h1>
        <p className="lead">We have received your order. You can check its status any time from your orders page.</p>
        <p>
          <Link className="button" href="/orders">View my orders</Link>
          <Link className="button secondary" href="/store">Continue shopping</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="content-page store-shell">
      <span className="eyebrow">DTECHNURSE STORE</span>
      <h1>Order {order.orderNumber}</h1>
      <p className="lead">We are wrapping things up. Here is where your order stands right now.</p>
      <OrderVerify orderId={order.id} initialStatus={order.status} />
      <div className="order-success">
        <div className="summary-row"><span>Order number</span><span>{order.orderNumber}</span></div>
        <div className="summary-row"><span>Total</span><span>{formatNaira(order.totalKobo)}</span></div>
        <div className="summary-row"><span>Status</span><span><span className={`status-pill ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span></span></div>
        <p>
          <Link className="button" href={`/orders/${order.id}`}>View order details</Link>
          <Link className="button secondary" href="/store">Continue shopping</Link>
        </p>
      </div>
    </main>
  );
}
