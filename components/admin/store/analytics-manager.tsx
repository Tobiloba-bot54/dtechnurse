// File: DTECHNURSE-SITE-main/components/admin/store/analytics-manager.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/services/http';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VALUES,
  formatNaira,
  type OrderStatus,
  type OrderSummary,
} from '@/lib/services/store/types';

type TopProduct = { title: string; quantitySold?: number; quantity?: number; revenueKobo: number };
type LowStockItem = { id: string; title: string; stockQuantity: number; lowStockThreshold: number };
type InventoryLog = { listingTitle: string; quantityChange: number; reason: string; createdAt: string };
type StoreAnalytics = {
  revenueKobo: number;
  ordersCount: Record<string, number>;
  topProducts: TopProduct[];
  lowStock: LowStockItem[];
  recentOrders: OrderSummary[];
  inventoryLogs: InventoryLog[];
};

function unitsSold(product: TopProduct): number { return product.quantitySold ?? product.quantity ?? 0; }
function friendlyReason(reason: string): string { return reason.replace(/_/g, ' '); }

export function AnalyticsManager() {
  const [analytics, setAnalytics] = useState<StoreAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ analytics: StoreAnalytics }>('/api/admin/store/analytics');
      setAnalytics({
        revenueKobo: data.analytics?.revenueKobo ?? 0,
        ordersCount: data.analytics?.ordersCount ?? {},
        topProducts: data.analytics?.topProducts ?? [],
        lowStock: data.analytics?.lowStock ?? [],
        recentOrders: data.analytics?.recentOrders ?? [],
        inventoryLogs: data.analytics?.inventoryLogs ?? [],
      });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Store analytics could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !analytics) return <section className="store-admin" aria-label="Store analytics"><p className="admin-muted">Loading store analytics…</p></section>;
  if (error && !analytics) return <section className="store-admin" aria-label="Store analytics"><p className="danger-text" role="alert">{error}</p></section>;
  if (!analytics) return <section className="store-admin" aria-label="Store analytics"><div className="empty-state">No analytics available yet.</div></section>;

  const totalOrders = ORDER_STATUS_VALUES.reduce((sum, status) => sum + (analytics.ordersCount[status] ?? 0), 0);
  const paidOrders = (analytics.ordersCount.paid ?? 0) + (analytics.ordersCount.shipped ?? 0) + (analytics.ordersCount.finished ?? 0);

  return (
    <section className="store-admin" aria-label="Store analytics">
      <div className="admin-toolbar">
        <button type="button" className="button secondary small" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {error && <p className="danger-text" role="alert">{error}</p>}
      <section className="admin-stat-grid" aria-label="Store statistics">
        <div className="admin-stat-card"><span>Total revenue</span><strong>{formatNaira(analytics.revenueKobo)}</strong></div>
        <div className="admin-stat-card"><span>Total orders</span><strong>{totalOrders}</strong></div>
        <div className="admin-stat-card"><span>Paid orders</span><strong>{paidOrders}</strong></div>
        <div className="admin-stat-card"><span>Pending payment</span><strong>{analytics.ordersCount.pending_payment ?? 0}</strong></div>
        <div className="admin-stat-card"><span>Disputed</span><strong>{analytics.ordersCount.disputed ?? 0}</strong></div>
        <div className="admin-stat-card"><span>Low stock products</span><strong>{analytics.lowStock.length}</strong></div>
      </section>

      <div className="admin-form-grid">
        <div className="admin-panel">
          <div className="admin-panel-head">
            <div><span className="eyebrow">TOP PRODUCTS</span><h3>Top products</h3></div>
          </div>
          {analytics.topProducts.length === 0 ? <p className="muted-text">No paid orders yet.</p> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Title</th><th>Units sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {analytics.topProducts.map((product, index) => (
                    <tr key={`${product.title}-${index}`}>
                      <td><strong>{product.title || 'Removed product'}</strong></td>
                      <td>{unitsSold(product)}</td>
                      <td className="money">{formatNaira(product.revenueKobo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div><span className="eyebrow">LOW STOCK</span><h3>Low stock</h3></div>
          </div>
          {analytics.lowStock.length === 0 ? <p className="muted-text">No published products are at or below their threshold.</p> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Title</th><th>In stock</th><th>Threshold</th></tr></thead>
                <tbody>
                  {analytics.lowStock.map(item => (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong></td>
                      <td>
                        <span className={`stock-badge ${item.stockQuantity <= 0 ? 'out' : 'low'}`}>
                          {item.stockQuantity <= 0 ? 'Out of stock' : `${item.stockQuantity} left`}
                        </span>
                      </td>
                      <td>{item.lowStockThreshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div><span className="eyebrow">RECENT ORDERS</span><h3>Recent orders</h3></div>
          </div>
          {analytics.recentOrders.length === 0 ? <p className="muted-text">No orders yet.</p> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Order #</th><th>Status</th><th>Items</th><th>Total</th><th>Created</th></tr></thead>
                <tbody>
                  {analytics.recentOrders.map(order => (
                    <tr key={order.id}>
                      <td><strong>{order.orderNumber}</strong></td>
                      <td><span className={`status-pill ${order.status}`}>{ORDER_STATUS_LABELS[order.status as OrderStatus] ?? order.status}</span></td>
                      <td>{order.itemCount}</td>
                      <td className="money">{formatNaira(order.totalKobo)}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel-head">
            <div><span className="eyebrow">INVENTORY LOG</span><h3>Inventory log</h3></div>
          </div>
          {analytics.inventoryLogs.length === 0 ? <p className="muted-text">No stock movements recorded yet.</p> : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Listing</th><th>Change</th><th>Reason</th><th>Date</th></tr></thead>
                <tbody>
                  {analytics.inventoryLogs.map((log, index) => (
                    <tr key={`${log.listingTitle}-${index}`}>
                      <td>{log.listingTitle || 'Removed listing'}</td>
                      <td>
                        {log.quantityChange > 0 ? <span className="success-text">+{log.quantityChange}</span>
                          : log.quantityChange < 0 ? <span className="danger-text">{log.quantityChange}</span>
                          : <span className="muted-text">0</span>}
                      </td>
                      <td>{friendlyReason(log.reason)}</td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
