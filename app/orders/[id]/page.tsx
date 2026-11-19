import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { getOrderDetail } from '@/lib/services/store/orders';
import { OrderActions } from '@/components/store/order-actions';
import { formatNaira, formatSelectedAttributes, ORDER_STATUS_LABELS, parseSelectedAttributes, type OrderDetail } from '@/lib/services/store/types';

type Params = { id: string };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function itemAttributes(value: OrderDetail['items'][number]['selectedAttributes']): Record<string, string> {
  if (!value) return {};
  if (typeof value === 'string') return parseSelectedAttributes(value);
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { title: 'Order | DTECHNURSE' };
  const order = await getOrderDetail(data.user.id, id).catch(() => null);
  return { title: order ? `Order ${order.orderNumber} | DTECHNURSE` : 'Order not found | DTECHNURSE' };
}

export default async function OrderDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/orders')}`);
  const order = await getOrderDetail(data.user.id, id).catch(() => null);
  if (!order) notFound();

  return (
    <main className="content-page store-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        <Link href="/orders">My orders</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{order.orderNumber}</span>
      </nav>
      <div className="order-headline">
        <h1>Order {order.orderNumber}</h1>
        <span className={`status-pill ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span>
        <p>Placed {formatDate(order.createdAt)}{order.paymentProvider ? ` · Paid via ${order.paymentProvider}` : ''}</p>
      </div>
      <div className="order-detail-layout">
        <div>
          <section aria-label="Order progress">
            <h2>Progress</h2>
            <ol className="order-timeline">
              {order.history.map((event, index) => (
                <li key={event.id} className={index === order.history.length - 1 ? 'timeline-step current' : 'timeline-step done'}>
                  <span className="timeline-step-label">{ORDER_STATUS_LABELS[event.status] ?? event.status}</span>
                  {event.note && <small>{event.note}</small>}
                  {formatDate(event.createdAt) && <small>{formatDate(event.createdAt)}</small>}
                </li>
              ))}
            </ol>
          </section>
          <section aria-label="Items in this order">
            <h2>Items</h2>
            <table className="order-items-table">
              <thead>
                <tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Total</th><th scope="col">Files</th></tr>
              </thead>
              <tbody>
                {order.items.map(item => {
                  const attrs = itemAttributes(item.selectedAttributes);
                  const attrsText = formatSelectedAttributes(attrs);
                  return (
                    <tr key={item.id}>
                      <td>
                        <img src={item.imageUrl || '/dtechnurse-logo.jpg'} alt="" loading="lazy" />
                        <div>
                          <Link href={`/store/listing/${item.slug}`}>{item.title}</Link>
                          {attrsText && <small>{attrsText}</small>}
                          {item.isDigital && <small>Digital product</small>}
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatNaira(item.totalPriceKobo)}</td>
                      <td>
                        {item.downloadable
                          ? <a href={`/api/store/downloads/${encodeURIComponent(item.id)}`}><Download size={14} aria-hidden="true" /> Download</a>
                          : <span aria-hidden="true">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
        <aside>
          <div className="address-block">
            <h2>Delivery address</h2>
            <p>{order.shippingAddress}</p>
            {order.shippingStateName && <p>{order.shippingStateName}</p>}
          </div>
          <div className="cart-summary">
            <h2>Summary</h2>
            <div className="summary-row"><span>Subtotal</span><span>{formatNaira(order.subtotalKobo)}</span></div>
            {order.discountKobo > 0 && (
              <div className="summary-row"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>-{formatNaira(order.discountKobo)}</span></div>
            )}
            <div className="summary-row"><span>Delivery{order.shippingZoneName ? ` (${order.shippingZoneName})` : ''}</span><span>{order.shippingFeeKobo === 0 ? 'Free' : formatNaira(order.shippingFeeKobo)}</span></div>
            <div className="summary-total"><span>Total</span><span>{formatNaira(order.totalKobo)}</span></div>
          </div>
          {order.refunds.length > 0 && (
            <section aria-label="Refunds">
              <h2>Refunds</h2>
              <ul>
                {order.refunds.map((refund, index) => (
                  <li key={index}>
                    <strong>{formatNaira(refund.amountKobo)}</strong> via {refund.provider}
                    {refund.note ? ` · ${refund.note}` : ''}
                    {refund.reference ? ` · Ref ${refund.reference}` : ''}
                    {formatDate(refund.createdAt) ? ` · ${formatDate(refund.createdAt)}` : ''}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {order.dispute && (
            <div className="dispute-box">
              <h2>Dispute</h2>
              <p><strong>{order.dispute.disputeType === 'exchange' ? 'Exchange requested' : 'Refund requested'}</strong> · Status: {order.dispute.status}</p>
              <p>{order.dispute.reason}</p>
            </div>
          )}
        </aside>
      </div>
      <OrderActions order={order} />
    </main>
  );
}
