// File: DTECHNURSE-SITE-main/components/admin/store/promotions-manager.tsx
'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/services/http';
import { formatNaira } from '@/lib/services/store/types';

type CouponRecord = {
  id: string; code: string; description: string; discountType: 'percentage' | 'fixed'; discountValue: number;
  minOrderAmountKobo: number; maxUses: number | null; usedCount: number; perUserLimit: number;
  startsAt: string | null; endsAt: string | null; isActive: boolean; createdAt: string; updatedAt: string;
};
type FlashDealRecord = {
  id: string; listingId: string; listingTitle: string; discountType: 'percentage' | 'fixed'; discountValue: number;
  startsAt: string; endsAt: string; isActive: boolean; createdAt: string; updatedAt: string;
};
type PickerProduct = { id: string; title: string; priceKobo: number };
type PromoTab = 'coupons' | 'deals';

type CouponForm = {
  code: string; description: string; discountType: 'percentage' | 'fixed'; discountValue: string;
  minOrder: string; maxUses: string; perUserLimit: string; startsAt: string; endsAt: string; isActive: boolean;
};
type DealForm = { listingId: string; listingTitle: string; discountType: 'percentage' | 'fixed'; discountValue: string; startsAt: string; endsAt: string; isActive: boolean };

function toKobo(naira: number): number { return Math.round(naira * 100); }
function fromKobo(kobo: number): number { return (Number(kobo) || 0) / 100; }

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function formatWindow(startsAt: string | null, endsAt: string | null): string {
  const start = startsAt ? new Date(startsAt).toLocaleString() : '';
  const end = endsAt ? new Date(endsAt).toLocaleString() : '';
  if (!start && !end) return 'Always active';
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} to ${end}`;
}
function discountLabel(type: string, value: number): string { return type === 'percentage' ? `${value}%` : formatNaira(value); }

async function searchProducts(q: string): Promise<PickerProduct[]> {
  if (!q.trim()) return [];
  const data = await apiRequest<{ listings?: unknown[]; items?: unknown[] }>(`/api/store/catalog?q=${encodeURIComponent(q.trim())}`);
  const rows = (Array.isArray(data.listings) ? data.listings : Array.isArray(data.items) ? data.items : []) as Array<Record<string, unknown>>;
  return rows
    .map(row => ({
      id: typeof row.id === 'string' ? row.id : typeof row.listingId === 'string' ? row.listingId : '',
      title: typeof row.title === 'string' ? row.title : '',
      priceKobo: typeof row.priceKobo === 'number' ? row.priceKobo : 0,
    }))
    .filter(row => row.id && row.title);
}

const emptyCoupon: CouponForm = { code: '', description: '', discountType: 'percentage', discountValue: '', minOrder: '', maxUses: '', perUserLimit: '1', startsAt: '', endsAt: '', isActive: true };
const emptyDeal: DealForm = { listingId: '', listingTitle: '', discountType: 'percentage', discountValue: '', startsAt: '', endsAt: '', isActive: true };

export function PromotionsManager() {
  const [tab, setTab] = useState<PromoTab>('coupons');

  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [couponLoading, setCouponLoading] = useState(true);
  const [couponError, setCouponError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCoupon);
  const [editingCouponId, setEditingCouponId] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const [deals, setDeals] = useState<FlashDealRecord[]>([]);
  const [dealLoading, setDealLoading] = useState(true);
  const [dealError, setDealError] = useState('');
  const [dealMessage, setDealMessage] = useState('');
  const [dealForm, setDealForm] = useState<DealForm>(emptyDeal);
  const [editingDealId, setEditingDealId] = useState('');
  const [dealBusy, setDealBusy] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<PickerProduct[]>([]);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [pickerError, setPickerError] = useState('');

  const loadCoupons = useCallback(async () => {
    setCouponLoading(true);
    try {
      const data = await apiRequest<{ items: CouponRecord[] }>('/api/admin/store/promotions?type=coupon');
      setCoupons(data.items ?? []);
      setCouponError('');
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : 'Coupons could not be loaded.');
    } finally { setCouponLoading(false); }
  }, []);

  const loadDeals = useCallback(async () => {
    setDealLoading(true);
    try {
      const data = await apiRequest<{ items: FlashDealRecord[] }>('/api/admin/store/promotions?type=deal');
      setDeals(data.items ?? []);
      setDealError('');
    } catch (e) {
      setDealError(e instanceof Error ? e.message : 'Flash deals could not be loaded.');
    } finally { setDealLoading(false); }
  }, []);

  useEffect(() => { void loadCoupons(); }, [loadCoupons]);
  useEffect(() => { void loadDeals(); }, [loadDeals]);

  function updateCoupon<K extends keyof CouponForm>(key: K, value: CouponForm[K]) { setCouponForm(current => ({ ...current, [key]: value })); }
  function updateDeal<K extends keyof DealForm>(key: K, value: DealForm[K]) { setDealForm(current => ({ ...current, [key]: value })); }

  function editCoupon(coupon: CouponRecord) {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrder: String(fromKobo(coupon.minOrderAmountKobo)),
      maxUses: coupon.maxUses === null || coupon.maxUses === undefined ? '' : String(coupon.maxUses),
      perUserLimit: String(coupon.perUserLimit),
      startsAt: toLocalInput(coupon.startsAt),
      endsAt: toLocalInput(coupon.endsAt),
      isActive: coupon.isActive,
    });
    setCouponMessage(`Editing coupon ${coupon.code}.`);
  }

  async function saveCoupon(event: FormEvent) {
    event.preventDefault();
    setCouponBusy(true); setCouponError(''); setCouponMessage('');
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: Math.floor(Number(couponForm.discountValue || 0)),
        minOrderAmountKobo: toKobo(Number(couponForm.minOrder || 0)),
        maxUses: couponForm.maxUses.trim() === '' ? null : Math.max(0, Math.floor(Number(couponForm.maxUses))),
        perUserLimit: Math.max(0, Math.floor(Number(couponForm.perUserLimit || 0))),
        startsAt: fromLocalInput(couponForm.startsAt),
        endsAt: fromLocalInput(couponForm.endsAt),
        isActive: couponForm.isActive,
      };
      if (editingCouponId) await apiRequest(`/api/admin/store/promotions?type=coupon&id=${encodeURIComponent(editingCouponId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await apiRequest('/api/admin/store/promotions?type=coupon', { method: 'POST', body: JSON.stringify(payload) });
      setEditingCouponId(''); setCouponForm(emptyCoupon);
      setCouponMessage('Coupon saved.');
      await loadCoupons();
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : 'The coupon could not be saved.');
    } finally { setCouponBusy(false); }
  }

  async function removeCoupon(coupon: CouponRecord) {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    setCouponError(''); setCouponMessage('');
    try {
      await apiRequest(`/api/admin/store/promotions?type=coupon&id=${encodeURIComponent(coupon.id)}`, { method: 'DELETE' });
      setCouponMessage(`Coupon ${coupon.code} deleted.`);
      if (editingCouponId === coupon.id) { setEditingCouponId(''); setCouponForm(emptyCoupon); }
      await loadCoupons();
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : 'The coupon could not be deleted.');
    }
  }

  function editDeal(deal: FlashDealRecord) {
    setEditingDealId(deal.id);
    setDealForm({ listingId: deal.listingId, listingTitle: deal.listingTitle, discountType: deal.discountType, discountValue: String(deal.discountValue), startsAt: toLocalInput(deal.startsAt), endsAt: toLocalInput(deal.endsAt), isActive: deal.isActive });
    setDealMessage(`Editing flash deal for ${deal.listingTitle || 'product'}.`);
  }

  async function searchPicker() {
    setPickerBusy(true); setPickerError('');
    try { setPickerResults(await searchProducts(pickerQuery)); }
    catch (e) { setPickerError(e instanceof Error ? e.message : 'Product search failed.'); setPickerResults([]); }
    finally { setPickerBusy(false); }
  }

  async function saveDeal(event: FormEvent) {
    event.preventDefault();
    if (!dealForm.listingId) { setDealError('Choose a product for this flash deal.'); return; }
    if (!dealForm.startsAt || !dealForm.endsAt) { setDealError('A flash deal needs a start and end time.'); return; }
    setDealBusy(true); setDealError(''); setDealMessage('');
    try {
      const payload = {
        listingId: dealForm.listingId,
        discountType: dealForm.discountType,
        discountValue: Math.floor(Number(dealForm.discountValue || 0)),
        startsAt: fromLocalInput(dealForm.startsAt),
        endsAt: fromLocalInput(dealForm.endsAt),
        isActive: dealForm.isActive,
      };
      if (editingDealId) await apiRequest(`/api/admin/store/promotions?type=deal&id=${encodeURIComponent(editingDealId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
      else await apiRequest('/api/admin/store/promotions?type=deal', { method: 'POST', body: JSON.stringify(payload) });
      setEditingDealId(''); setDealForm(emptyDeal); setPickerResults([]);
      setDealMessage('Flash deal saved.');
      await loadDeals();
    } catch (e) {
      setDealError(e instanceof Error ? e.message : 'The flash deal could not be saved.');
    } finally { setDealBusy(false); }
  }

  async function removeDeal(deal: FlashDealRecord) {
    if (!window.confirm(`Delete the flash deal for ${deal.listingTitle || 'this product'}?`)) return;
    setDealError(''); setDealMessage('');
    try {
      await apiRequest(`/api/admin/store/promotions?type=deal&id=${encodeURIComponent(deal.id)}`, { method: 'DELETE' });
      setDealMessage('Flash deal deleted.');
      if (editingDealId === deal.id) { setEditingDealId(''); setDealForm(emptyDeal); }
      await loadDeals();
    } catch (e) {
      setDealError(e instanceof Error ? e.message : 'The flash deal could not be deleted.');
    }
  }

  return (
    <section className="store-admin" aria-label="Promotions">
      <div className="admin-toolbar">
        <div className="form-row" role="tablist" aria-label="Promotion types">
          <button type="button" role="tab" aria-selected={tab === 'coupons'} className={`tab-pill ${tab === 'coupons' ? 'active' : ''}`} onClick={() => setTab('coupons')}>Coupons</button>
          <button type="button" role="tab" aria-selected={tab === 'deals'} className={`tab-pill ${tab === 'deals' ? 'active' : ''}`} onClick={() => setTab('deals')}>Flash deals</button>
        </div>
      </div>

      {tab === 'coupons' ? (
        <>
          {couponMessage && <p className="success-text" role="status">{couponMessage}</p>}
          {couponError && <p className="danger-text" role="alert">{couponError}</p>}
          {couponLoading ? <p className="admin-muted">Loading coupons…</p> : coupons.length === 0 ? (
            <div className="empty-state">No coupons yet. Create one to reward customers at checkout.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min order</th><th>Used / max</th><th>Per user</th><th>Window</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {coupons.map(coupon => (
                    <tr key={coupon.id}>
                      <td><strong>{coupon.code}</strong></td>
                      <td>{coupon.discountType === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                      <td>{discountLabel(coupon.discountType, coupon.discountValue)}</td>
                      <td className="money">{formatNaira(coupon.minOrderAmountKobo)}</td>
                      <td>{coupon.usedCount} / {coupon.maxUses === null ? '∞' : coupon.maxUses}</td>
                      <td>{coupon.perUserLimit}</td>
                      <td>{formatWindow(coupon.startsAt, coupon.endsAt)}</td>
                      <td>{coupon.isActive ? <span className="success-text">Active</span> : <span className="muted-text">Off</span>}</td>
                      <td>
                        <div className="form-row">
                          <button type="button" className="button secondary small" onClick={() => editCoupon(coupon)}>Edit</button>
                          <button type="button" className="button secondary small" onClick={() => void removeCoupon(coupon)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-panel">
            <div className="admin-panel-head">
              <div><span className="eyebrow">{editingCouponId ? 'EDIT COUPON' : 'NEW COUPON'}</span><h3>{editingCouponId ? 'Update coupon' : 'Create coupon'}</h3></div>
              {editingCouponId && <button type="button" className="button secondary small" onClick={() => { setEditingCouponId(''); setCouponForm(emptyCoupon); setCouponMessage(''); }}>Cancel edit</button>}
            </div>
            <form onSubmit={saveCoupon}>
              <div className="admin-form-grid">
                <label className="form-field">Code<input className="form-control" required value={couponForm.code} onChange={e => updateCoupon('code', e.target.value.toUpperCase())} placeholder="SUMMER10" /></label>
                <label className="form-field">Description (optional)<input className="form-control" value={couponForm.description} onChange={e => updateCoupon('description', e.target.value)} placeholder="Shown to customers at checkout" /></label>
                <div className="form-row">
                  <label className="form-field">Type
                    <select className="form-control" value={couponForm.discountType} onChange={e => updateCoupon('discountType', e.target.value === 'fixed' ? 'fixed' : 'percentage')}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </label>
                  <label className="form-field">{couponForm.discountType === 'percentage' ? 'Discount percentage' : 'Discount amount in naira'}
                    <input className="form-control" type="number" min="1" step="any" required value={couponForm.discountValue} onChange={e => updateCoupon('discountValue', e.target.value)} />
                  </label>
                </div>
                <div className="form-row">
                  <label className="form-field">Minimum order in naira<input className="form-control" type="number" min="0" step="any" value={couponForm.minOrder} onChange={e => updateCoupon('minOrder', e.target.value)} placeholder="0" /></label>
                  <label className="form-field">Max uses (blank = unlimited)<input className="form-control" type="number" min="1" step="1" value={couponForm.maxUses} onChange={e => updateCoupon('maxUses', e.target.value)} /></label>
                  <label className="form-field">Per user limit<input className="form-control" type="number" min="0" step="1" value={couponForm.perUserLimit} onChange={e => updateCoupon('perUserLimit', e.target.value)} /></label>
                </div>
                <div className="form-row">
                  <label className="form-field">Starts (optional)<input className="form-control" type="datetime-local" value={couponForm.startsAt} onChange={e => updateCoupon('startsAt', e.target.value)} /></label>
                  <label className="form-field">Ends (optional)<input className="form-control" type="datetime-local" value={couponForm.endsAt} onChange={e => updateCoupon('endsAt', e.target.value)} /></label>
                </div>
              </div>
              <label className="admin-feature-toggle">
                <span><strong>Active</strong><small>Inactive coupons are rejected at checkout.</small></span>
                <input type="checkbox" checked={couponForm.isActive} onChange={e => updateCoupon('isActive', e.target.checked)} />
              </label>
              <button className="button small" type="submit" disabled={couponBusy}>{couponBusy ? 'Saving…' : editingCouponId ? 'Update coupon' : 'Create coupon'}</button>
            </form>
          </div>
        </>
      ) : (
        <>
          {dealMessage && <p className="success-text" role="status">{dealMessage}</p>}
          {dealError && <p className="danger-text" role="alert">{dealError}</p>}
          {dealLoading ? <p className="admin-muted">Loading flash deals…</p> : deals.length === 0 ? (
            <div className="empty-state">No flash deals yet. Create one to discount a product for a limited window.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Listing</th><th>Type</th><th>Value</th><th>Window</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody>
                  {deals.map(deal => (
                    <tr key={deal.id}>
                      <td><strong>{deal.listingTitle || 'Unavailable product'}</strong></td>
                      <td>{deal.discountType === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                      <td>{discountLabel(deal.discountType, deal.discountValue)}</td>
                      <td>{formatWindow(deal.startsAt, deal.endsAt)}</td>
                      <td>{deal.isActive ? <span className="success-text">Active</span> : <span className="muted-text">Off</span>}</td>
                      <td>
                        <div className="form-row">
                          <button type="button" className="button secondary small" onClick={() => editDeal(deal)}>Edit</button>
                          <button type="button" className="button secondary small" onClick={() => void removeDeal(deal)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-panel">
            <div className="admin-panel-head">
              <div><span className="eyebrow">{editingDealId ? 'EDIT FLASH DEAL' : 'NEW FLASH DEAL'}</span><h3>{editingDealId ? 'Update flash deal' : 'Create flash deal'}</h3></div>
              {editingDealId && <button type="button" className="button secondary small" onClick={() => { setEditingDealId(''); setDealForm(emptyDeal); setPickerResults([]); setDealMessage(''); }}>Cancel edit</button>}
            </div>
            <form onSubmit={saveDeal}>
              <p className="muted-text">Selected product: {dealForm.listingTitle || 'None yet. Search below.'}</p>
              <div className="form-row">
                <input
                  className="form-control"
                  placeholder="Search products by title"
                  value={pickerQuery}
                  onChange={e => setPickerQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void searchPicker(); } }}
                  aria-label="Search products for flash deal"
                />
                <button type="button" className="button secondary small" onClick={() => void searchPicker()} disabled={pickerBusy}>Find products</button>
              </div>
              {pickerError && <p className="danger-text">{pickerError}</p>}
              {pickerResults.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Product</th><th>Price</th><th>Action</th></tr></thead>
                    <tbody>
                      {pickerResults.map(product => (
                        <tr key={product.id}>
                          <td>{product.title}</td>
                          <td className="money">{formatNaira(product.priceKobo)}</td>
                          <td><button type="button" className="button secondary small" onClick={() => { updateDeal('listingId', product.id); updateDeal('listingTitle', product.title); setPickerResults([]); }}>Choose</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="admin-form-grid">
                <div className="form-row">
                  <label className="form-field">Type
                    <select className="form-control" value={dealForm.discountType} onChange={e => updateDeal('discountType', e.target.value === 'fixed' ? 'fixed' : 'percentage')}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </select>
                  </label>
                  <label className="form-field">{dealForm.discountType === 'percentage' ? 'Discount percentage' : 'Discount amount in naira'}
                    <input className="form-control" type="number" min="1" step="any" required value={dealForm.discountValue} onChange={e => updateDeal('discountValue', e.target.value)} />
                  </label>
                </div>
                <div className="form-row">
                  <label className="form-field">Starts<input className="form-control" type="datetime-local" required value={dealForm.startsAt} onChange={e => updateDeal('startsAt', e.target.value)} /></label>
                  <label className="form-field">Ends<input className="form-control" type="datetime-local" required value={dealForm.endsAt} onChange={e => updateDeal('endsAt', e.target.value)} /></label>
                </div>
              </div>
              <label className="admin-feature-toggle">
                <span><strong>Active</strong><small>Only active deals within their window change the storefront price.</small></span>
                <input type="checkbox" checked={dealForm.isActive} onChange={e => updateDeal('isActive', e.target.checked)} />
              </label>
              <button className="button small" type="submit" disabled={dealBusy}>{dealBusy ? 'Saving…' : editingDealId ? 'Update flash deal' : 'Create flash deal'}</button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
