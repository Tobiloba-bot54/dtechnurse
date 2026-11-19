// File: DTECHNURSE-SITE-main/components/admin/store/orders-manager.tsx
'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/services/http';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VALUES,
  formatNaira,
  formatSelectedAttributes,
  type OrderDetail,
  type OrderStatus,
  type OrderSummary,
} from '@/lib/services/store/types';

type AdminOrderRow = OrderSummary & { buyerEmail: string; buyerName?: string; buyerDisplayName?: string };
type OrdersResponse = { orders: AdminOrderRow[]; total: number; page: number; pages: number };
type AdminOrderDetail = OrderDetail & { buyerEmail: string; buyerName?: string; buyerDisplayName?: string };

function toKobo(naira: number): number { return Math.round(naira * 100); }
function buyerLabel(order: { buyerName?: string; buyerDisplayName?: string; buyerEmail: string }): string {
  return order.buyerName || order.buyerDisplayName || order.buyerEmail || '-';
}

const REFUND_PROVIDERS: Array<{ value: 'paystack' | 'flutterwave' | 'other'; label: string }> = [
  { value: 'paystack', label: 'Paystack' },
  { value: 'flutterwave', label: 'Flutterwave' },
  { value: 'other', label: 'Other' },
];

export function OrdersManager() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState('');
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailMessage, setDetailMessage] = useState('');

  const [nextStatus, setNextStatus] = useState<OrderStatus>('paid');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [refundAmount, setRefundAmount] = useState('');
  const [refundProvider, setRefundProvider] = useState<'paystack' | 'flutterwave' | 'other'>('paystack');
  const [refundReference, setRefundReference] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [linkDispute, setLinkDispute] = useState(true);
  const [refundBusy, setRefundBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (appliedQuery.trim()) params.set('q', appliedQuery.trim());
      params.set('page', String(page));
      const data = await apiRequest<OrdersResponse>(`/api/admin/store/orders?${params.toString()}`);
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Orders could not be loaded.');
    } finally { setLoading(false); }
  }, [statusFilter, appliedQuery, page]);

  useEffect(() => { void load(); }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true); setDetailError(''); setDetailMessage('');
    try {
      const data = await apiRequest<{ order: AdminOrderDetail }>(`/api/admin/store/orders/${id}`);
      setOrder(data.order);
      setNextStatus(data.order.status);
      setStatusNote('');
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'The order could not be loaded.');
      setOrder(null);
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [selectedId, loadDetail]);

  async function updateStatus(event: FormEvent) {
    event.preventDefault();
    if (!order) return;
    setUpdatingStatus(true); setDetailMessage(''); setDetailError('');
    try {
      await apiRequest(`/api/admin/store/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus, note: statusNote }) });
      setDetailMessage('Order updated.');
      setStatusNote('');
      await loadDetail(order.id);
      await load();
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'The order could not be updated.');
    } finally { setUpdatingStatus(false); }
  }

  async function submitRefund(event: FormEvent) {
    event.preventDefault();
    if (!order) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setDetailError('Enter a refund amount greater than zero.'); return; }
    if (toKobo(amount) > order.totalKobo) { setDetailError('The refund cannot exceed the order total.'); return; }
    setRefundBusy(true); setDetailMessage(''); setDetailError('');
    try {
      const payload: Record<string, unknown> = {
        action: 'refund',
        amountKobo: toKobo(amount),
        provider: refundProvider,
        reference: refundReference,
        note: refundNote,
      };
      if (order.dispute && linkDispute && ['open', 'in_review'].includes(order.dispute.status)) payload.disputeId = order.dispute.id;
      const data = await apiRequest<{ refundedTotalKobo: number }>(`/api/admin/store/orders/${order.id}`, { method: 'POST', body: JSON.stringify(payload) });
      setDetailMessage(`Refund recorded. Refunded total so far: ${formatNaira(data.refundedTotalKobo)}.`);
      setRefundAmount(''); setRefundReference(''); setRefundNote('');
      await loadDetail(order.id);
      await load();
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'The refund could not be recorded.');
    } finally { setRefundBusy(false); }
  }

  if (selectedId && order) {
    const refundedTotal = order.refunds.reduce((sum, refund) => sum + refund.amountKobo, 0);
    return (
      <section className="store-admin" aria-label="Order detail">
        <div className="admin-toolbar">
          <button type="button" className="button secondary small" onClick={() => { setSelectedId(''); setOrder(null); }}>Back to orders</button>
        </div>
        {detailError && <p className="danger-text" role="alert">{detailError}</p>}
        {detailMessage && <p className="success-text" role="status">{detailMessage}</p>}
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <span className="eyebrow">ORDER {order.orderNumber}</span>
              <h2><span className={`status-pill ${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span></h2>
              <p className="admin-muted">Buyer: {buyerLabel(order)} ({order.buyerEmail}) · Created {new Date(order.createdAt).toLocaleString()} · Payment {order.paymentProvider || '-'}</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <section className="admin-panel">
              <h3>Items</h3>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Product</th><th>Options</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
                  <tbody>
                    {order.items.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.title}</strong>{item.isDigital ? <span className="muted-text"> · digital</span> : null}</td>
                        <td>{formatSelectedAttributes(item.selectedAttributes) || '-'}</td>
                        <td>{item.quantity}</td>
                        <td className="money">{formatNaira(item.unitPriceKobo)}</td>
                        <td className="money">{formatNaira(item.totalPriceKobo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Totals</h3>
              <p><span className="muted-text">Subtotal:</span> <span className="money">{formatNaira(order.subtotalKobo)}</span></p>
              {order.discountKobo > 0 && <p><span className="muted-text">Discount{order.couponCode ? ` (${order.couponCode})` : ''}:</span> <span className="money">-{formatNaira(order.discountKobo)}</span></p>}
              <p><span className="muted-text">Shipping{order.shippingZoneName ? ` (${order.shippingZoneName}${order.shippingStateName ? `, ${order.shippingStateName}` : ''})` : ''}:</span> <span className="money">{formatNaira(order.shippingFeeKobo)}</span></p>
              <p><span className="muted-text">Order total:</span> <span className="money">{formatNaira(order.totalKobo)}</span></p>
              {refundedTotal > 0 && <p><span className="muted-text">Refunded total:</span> <span className="money">{formatNaira(refundedTotal)}</span></p>}

              <h3>Shipping address</h3>
              {order.shippingAddress.split('\n').map((line, index) => <p key={index} className="muted-text">{line}</p>)}

              {order.dispute && (
                <section aria-label="Dispute">
                  <h3 className="danger-text">Dispute</h3>
                  <p><span className={`status-pill ${order.dispute.status}`}>{order.dispute.status.replace('_', ' ')}</span></p>
                  <p className="muted-text">Type: {order.dispute.disputeType}</p>
                  <p className="muted-text">{order.dispute.reason}</p>
                </section>
              )}

              {order.refunds.length > 0 && (
                <section aria-label="Refunds">
                  <h3>Refunds</h3>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Amount</th><th>Provider</th><th>Reference</th><th>Note</th><th>Date</th></tr></thead>
                      <tbody>
                        {order.refunds.map((refund, index) => (
                          <tr key={index}>
                            <td className="money">{formatNaira(refund.amountKobo)}</td>
                            <td>{refund.provider}</td>
                            <td>{refund.reference || '-'}</td>
                            <td>{refund.note || '-'}</td>
                            <td>{new Date(refund.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </section>

            <section className="admin-panel">
              <h3>Timeline</h3>
              <ul>
                {order.history.map(event => (
                  <li key={event.id}>
                    <span className={`status-pill ${event.status}`}>{ORDER_STATUS_LABELS[event.status]}</span>
                    <span className="muted-text"> {new Date(event.createdAt).toLocaleString()}</span>
                    {event.note && <p className="muted-text">{event.note}</p>}
                  </li>
                ))}
              </ul>
              {order.history.length === 0 && <p className="muted-text">No history yet.</p>}

              <h3>Update status</h3>
              <form onSubmit={updateStatus}>
                <label className="form-field">Status
                  <select className="form-control" value={nextStatus} onChange={e => setNextStatus(e.target.value as OrderStatus)}>
                    {ORDER_STATUS_VALUES.map(status => <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>)}
                  </select>
                </label>
                <label className="form-field">Note (optional)<input className="form-control" value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Shown in the order timeline" /></label>
                <button className="button small" type="submit" disabled={updatingStatus}>{updatingStatus ? 'Updating…' : 'Update order'}</button>
              </form>

              <h3>Record refund</h3>
              <form onSubmit={submitRefund}>
                <div className="form-row">
                  <label className="form-field">Amount in naira<input className="form-control" type="number" min="1" step="any" required value={refundAmount} onChange={e => setRefundAmount(e.target.value)} placeholder="0.00" /></label>
                  <label className="form-field">Provider
                    <select className="form-control" value={refundProvider} onChange={e => setRefundProvider(e.target.value as typeof refundProvider)}>
                      {REFUND_PROVIDERS.map(provider => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="form-field">Reference<input className="form-control" value={refundReference} onChange={e => setRefundReference(e.target.value)} placeholder="Gateway refund reference" /></label>
                <label className="form-field">Note<input className="form-control" value={refundNote} onChange={e => setRefundNote(e.target.value)} placeholder="Why was this refund issued?" /></label>
                {order.dispute && ['open', 'in_review'].includes(order.dispute.status) && (
                  <label className="admin-feature-toggle">
                    <span><strong>Resolve the linked dispute</strong><small>Marking the dispute resolved closes the customer complaint.</small></span>
                    <input type="checkbox" checked={linkDispute} onChange={e => setLinkDispute(e.target.checked)} />
                  </label>
                )}
                <button className="button small" type="submit" disabled={refundBusy}>{refundBusy ? 'Recording…' : 'Record refund'}</button>
              </form>
            </section>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="store-admin" aria-label="Store orders">
      <div className="admin-toolbar">
        <form className="form-row" onSubmit={(event: FormEvent) => { event.preventDefault(); setPage(1); setAppliedQuery(query); }}>
          <input className="form-control" placeholder="Search by order number" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search orders by order number" />
          <button className="button secondary small" type="submit">Search</button>
        </form>
        <div className="form-row" role="group" aria-label="Filter orders by status">
          <button type="button" className={`chip ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => { setStatusFilter('all'); setPage(1); }}>All</button>
          {ORDER_STATUS_VALUES.map(status => (
            <button key={status} type="button" className={`chip ${statusFilter === status ? 'active' : ''}`} onClick={() => { setStatusFilter(status); setPage(1); }}>{ORDER_STATUS_LABELS[status]}</button>
          ))}
        </div>
        <button type="button" className="button secondary small" onClick={() => void load()} disabled={loading}>Refresh</button>
      </div>
      {error && <p className="danger-text" role="alert">{error}</p>}
      {selectedId && detailLoading && <p className="admin-muted">Loading order…</p>}
      {selectedId && detailError && !order && (
        <div className="admin-toolbar">
          <p className="danger-text" role="alert">{detailError}</p>
          <button type="button" className="button secondary small" onClick={() => setSelectedId('')}>Back to orders</button>
        </div>
      )}
      {loading ? <p className="admin-muted">Loading orders…</p> : orders.length === 0 ? (
        <div className="empty-state">No orders found for this filter.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Order #</th><th>Buyer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {orders.map(row => (
                <tr key={row.id}>
                  <td><strong>{row.orderNumber}</strong></td>
                  <td>{buyerLabel(row)}<br /><span className="muted-text">{row.buyerEmail}</span></td>
                  <td>{row.itemCount}</td>
                  <td className="money">{formatNaira(row.totalKobo)}</td>
                  <td>{row.paymentProvider || '-'}</td>
                  <td><span className={`status-pill ${row.status}`}>{ORDER_STATUS_LABELS[row.status]}</span></td>
                  <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                  <td><button type="button" className="button secondary small" onClick={() => setSelectedId(row.id)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="pagination">
          <button type="button" className="page-btn" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
          <span className="muted-text">Page {page} of {pages} · {total} orders</span>
          <button type="button" className="page-btn" disabled={page >= pages} onClick={() => setPage(current => current + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
