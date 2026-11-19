'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { apiRequest, ApiError } from '@/lib/services/http';
import { formatNaira, formatSelectedAttributes, parseSelectedAttributes, type CartLine, type CartState } from '@/lib/services/store/types';

const LOGO_FALLBACK = '/dtechnurse-logo.jpg';

type CouponResponse = { ok: boolean; discountKobo?: number; error?: string };

function lineAttributes(value: CartLine['selectedAttributes']): Record<string, string> {
  if (!value) return {};
  if (typeof value === 'string') return parseSelectedAttributes(value);
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

export function CartView() {
  const [cart, setCart] = useState<CartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signInRequired, setSignInRequired] = useState(false);
  const [busyLine, setBusyLine] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMessage, setCouponMessage] = useState('');
  const [couponError, setCouponError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiRequest<{ cart: CartState }>('/api/store/cart')
      .then(data => { setCart(data.cart); setSignInRequired(false); })
      .catch(err => {
        if (err instanceof ApiError && err.status === 401) setSignInRequired(true);
        else setError(err instanceof Error ? err.message : 'Your cart could not be loaded.');
      })
      .finally(() => { setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setQuantity(itemId: string, quantity: number) {
    setBusyLine(itemId);
    setError('');
    try {
      const data = await apiRequest<{ cart: CartState }>('/api/store/cart', { method: 'PATCH', body: JSON.stringify({ itemId, quantity }) });
      setCart(data.cart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The quantity could not be updated.');
    } finally {
      setBusyLine('');
    }
  }

  async function removeLine(itemId: string) {
    setBusyLine(itemId);
    setError('');
    try {
      const data = await apiRequest<{ cart: CartState }>(`/api/store/cart?itemId=${encodeURIComponent(itemId)}`, { method: 'DELETE' });
      setCart(data.cart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The item could not be removed.');
    } finally {
      setBusyLine('');
    }
  }

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponMessage('');
    setCouponError('');
    try {
      const data = await apiRequest<CouponResponse>('/api/store/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) });
      if (data.ok) {
        setCouponMessage(`Coupon ${code.toUpperCase()} applied. You save ${formatNaira(data.discountKobo ?? 0)}.`);
        setCouponInput('');
        load();
      } else {
        setCouponError(data.error || 'This coupon could not be applied.');
      }
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'This coupon could not be applied.');
    } finally {
      setCouponBusy(false);
    }
  }

  async function removeCoupon() {
    setCouponBusy(true);
    setCouponMessage('');
    setCouponError('');
    try {
      await apiRequest<{ ok: boolean }>('/api/store/cart/coupon', { method: 'DELETE' });
      load();
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'The coupon could not be removed.');
    } finally {
      setCouponBusy(false);
    }
  }

  if (loading) return <p role="status" aria-live="polite">Loading your cart…</p>;
  if (signInRequired) {
    return (
      <div className="empty-state">
        <ShoppingCart className="empty-state-icon" aria-hidden="true" />
        <h2>Sign in to see your cart</h2>
        <p>Your cart is tied to your DTECHNURSE account so you can pick up on any device.</p>
        <Link className="button" href={`/login?next=${encodeURIComponent('/cart')}`}>Sign in</Link>
      </div>
    );
  }
  if (error && !cart) return <p className="form-error" role="alert">{error}</p>;
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="empty-state">
        <ShoppingCart className="empty-state-icon" aria-hidden="true" />
        <h2>Your cart is empty</h2>
        <p>Browse the store and add the things you need for your shift, your study, or your practice.</p>
        <Link className="button" href="/store">Shop the store</Link>
      </div>
    );
  }

  const totals = cart.totals;
  return (
    <div className="cart-layout">
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="cart-lines">
        {cart.lines.map(line => {
          const attrs = lineAttributes(line.selectedAttributes);
          const maxQty = line.trackStock ? Math.max(1, line.stockQuantity) : 99;
          return (
            <article className="cart-line" key={line.id}>
              <Link className="cart-line-media" href={`/store/listing/${line.slug}`} aria-label={`View ${line.title}`}>
                <img src={line.imageUrl || LOGO_FALLBACK} alt={line.title} loading="lazy" />
              </Link>
              <div className="cart-line-body">
                <h3><Link href={`/store/listing/${line.slug}`}>{line.title}</Link></h3>
                {Object.keys(attrs).length > 0 && <p className="cart-line-attrs">{formatSelectedAttributes(attrs)}</p>}
                <p className="cart-line-attrs">{formatNaira(line.unitPriceKobo)} each</p>
                <div className="qty-stepper">
                  <button type="button" className="qty-btn" onClick={() => setQuantity(line.id, line.quantity - 1)} disabled={busyLine === line.id || line.quantity <= 1} aria-label="Decrease quantity"><Minus size={16} aria-hidden="true" /></button>
                  <span className="qty-value">{line.quantity}</span>
                  <button type="button" className="qty-btn" onClick={() => setQuantity(line.id, Math.min(maxQty, line.quantity + 1))} disabled={busyLine === line.id || line.quantity >= maxQty} aria-label="Increase quantity"><Plus size={16} aria-hidden="true" /></button>
                </div>
                <button type="button" className="button secondary small" onClick={() => removeLine(line.id)} disabled={busyLine === line.id}>
                  <Trash2 size={14} aria-hidden="true" /> Remove
                </button>
              </div>
              <p className="cart-line-price">{formatNaira(line.lineTotalKobo)}</p>
            </article>
          );
        })}
      </div>
      <aside className="cart-summary" aria-label="Order summary">
        <div className="summary-row"><span>Subtotal ({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})</span><span>{formatNaira(totals.subtotalKobo)}</span></div>
        {totals.discountKobo > 0 && (
          <div className="summary-row"><span>Discount{totals.couponCode ? ` (${totals.couponCode})` : ''}</span><span>-{formatNaira(totals.discountKobo)}</span></div>
        )}
        <div className="summary-row"><span>Shipping</span><span>Calculated at checkout</span></div>
        <div className="summary-total"><span>Total before shipping</span><span>{formatNaira(totals.subtotalKobo - totals.discountKobo)}</span></div>
        <div className="coupon-row">
          {totals.couponCode ? (
            <>
              <span className="badge">Coupon {totals.couponCode}</span>
              <button type="button" className="button secondary small" onClick={removeCoupon} disabled={couponBusy}><X size={14} aria-hidden="true" /> Remove coupon</button>
            </>
          ) : (
            <>
              <label className="sr-only" htmlFor="coupon-code">Coupon code</label>
              <input id="coupon-code" className="form-control" value={couponInput} onChange={event => setCouponInput(event.target.value)} placeholder="Coupon code" />
              <button type="button" className="button small" onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()}>{couponBusy ? 'Checking…' : 'Apply'}</button>
            </>
          )}
        </div>
        {couponMessage && <p className="form-success" role="status">{couponMessage}</p>}
        {couponError && <p className="form-error" role="alert">{couponError}</p>}
        <Link className="button" href="/checkout">Checkout</Link>
        <Link className="text-link" href="/store">Continue shopping</Link>
      </aside>
    </div>
  );
}
