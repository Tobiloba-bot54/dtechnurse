'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ShoppingCart } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';
import { formatNaira, type AddressRecord, type CartState, type ShippingQuote } from '@/lib/services/store/types';

const ADDRESS_STORAGE_KEY = 'dtechnurse_store_address';

type AddressForm = { fullName: string; phone: string; street: string; city: string; localGovernment: string; state: string };

function addressFromRecord(record: AddressRecord | null): AddressForm {
  if (!record) return { fullName: '', phone: '', street: '', city: '', localGovernment: '', state: '' };
  return { fullName: record.fullName, phone: record.phone, street: record.street, city: record.city, localGovernment: record.localGovernment, state: record.state };
}

export function CheckoutView({ initialAddress, states: initialStates }: { initialAddress: AddressRecord | null; states: string[] }) {
  const router = useRouter();
  const [fields, setFields] = useState<AddressForm>(() => addressFromRecord(initialAddress));
  const [states, setStates] = useState<string[]>(initialStates);
  const [cart, setCart] = useState<CartState | null>(null);
  const [providers, setProviders] = useState<string[]>([]);
  const [provider, setProvider] = useState('');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState('');
  const [giftCardBusy, setGiftCardBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (!raw) return;
      const saved: unknown = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;
      const record = saved as Partial<AddressForm>;
      setFields({
        fullName: typeof record.fullName === 'string' ? record.fullName : '',
        phone: typeof record.phone === 'string' ? record.phone : '',
        street: typeof record.street === 'string' ? record.street : '',
        city: typeof record.city === 'string' ? record.city : '',
        localGovernment: typeof record.localGovernment === 'string' ? record.localGovernment : '',
        state: typeof record.state === 'string' ? record.state : '',
      });
    } catch { /* Ignore a malformed saved address. */ }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest<{ cart: CartState; paymentProviders: string[] }>('/api/store/cart')
      .then(data => {
        if (!active) return;
        setCart(data.cart);
        const list = Array.isArray(data.paymentProviders) ? data.paymentProviders : [];
        setProviders(list);
        setProvider(prev => prev || (list.length > 0 ? list[0] : ''));
      })
      .catch(err => { if (active) setPageError(err instanceof Error ? err.message : 'Your cart could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    apiRequest<{ states: string[] }>('/api/store/shipping/states')
      .then(data => { if (active && Array.isArray(data.states) && data.states.length > 0) setStates(data.states); })
      .catch(() => { /* Keep the server-provided states. */ });
    return () => { active = false; };
  }, []);

  const cartReady = cart !== null && cart.lines.length > 0;

  useEffect(() => {
    if (!cartReady) { setQuote(null); return; }
    const stateName = fields.state.trim();
    if (!stateName) { setQuote(null); return; }
    let active = true;
    setQuoteBusy(true);
    setQuoteError('');
    apiRequest<{ quote: ShippingQuote | null }>('/api/store/shipping/quote', { method: 'POST', body: JSON.stringify({ state: stateName }) })
      .then(data => { if (active) setQuote(data.quote ?? null); })
      .catch(() => { if (active) { setQuote(null); setQuoteError('The delivery fee could not be checked right now. Please try again.'); } })
      .finally(() => { if (active) setQuoteBusy(false); });
    return () => { active = false; };
  }, [fields.state, cartReady]);

  function updateField(key: keyof AddressForm, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function checkGiftCard() {
    const code = giftCardCode.trim();
    if (!code) return;
    setGiftCardBusy(true);
    setGiftCardError('');
    try {
      const data = await apiRequest<{ ok: boolean; balanceKobo?: number; error?: string }>('/api/store/cart/gift-card', { method: 'POST', body: JSON.stringify({ code }) });
      if (data.ok) setGiftCardBalance(data.balanceKobo ?? 0);
      else setGiftCardError(data.error || 'This gift card could not be validated.');
    } catch (err) {
      setGiftCardError(err instanceof Error ? err.message : 'This gift card could not be validated.');
    } finally {
      setGiftCardBusy(false);
    }
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!fields.fullName.trim() || !fields.phone.trim() || !fields.street.trim() || !fields.city.trim() || !fields.state.trim()) {
      setError('Please fill in your full name, phone, street address, city, and state.');
      return;
    }
    if (!provider) {
      setError('Please choose a payment method.');
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ orderId: string; orderNumber: string; amountDueKobo: number; paymentUrl: string | null }>('/api/store/checkout', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fields.fullName.trim(),
          phone: fields.phone.trim(),
          street: fields.street.trim(),
          city: fields.city.trim(),
          localGovernment: fields.localGovernment.trim(),
          state: fields.state,
          provider,
          ...(giftCardCode.trim() ? { giftCardCode: giftCardCode.trim() } : {}),
        }),
      });
      try {
        window.localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify({
          fullName: fields.fullName.trim(),
          phone: fields.phone.trim(),
          street: fields.street.trim(),
          city: fields.city.trim(),
          localGovernment: fields.localGovernment.trim(),
          state: fields.state,
        }));
      } catch { /* Saving the address locally is best effort. */ }
      if (data.paymentUrl) window.location.href = data.paymentUrl;
      else router.push(`/checkout/success?order=${encodeURIComponent(data.orderId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your order could not be placed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status" aria-live="polite">Loading checkout…</p>;
  if (pageError) return <p className="form-error" role="alert">{pageError}</p>;
  if (!cart || cart.lines.length === 0) {
    return (
      <div className="empty-state">
        <ShoppingCart className="empty-state-icon" aria-hidden="true" />
        <h2>Your cart is empty</h2>
        <p>Add products to your cart, then come back to check out.</p>
        <Link className="button" href="/store">Browse the store</Link>
      </div>
    );
  }

  const subtotal = cart.totals.subtotalKobo;
  const discount = cart.totals.discountKobo;
  const shippingFee = quote ? quote.feeKobo : 0;
  const total = Math.max(0, subtotal - discount + shippingFee);

  return (
    <section aria-label="Checkout">
      <ol className="checkout-steps" aria-label="Checkout steps">
        <li>Cart</li>
        <li aria-current="step">Delivery details</li>
        <li>Payment</li>
      </ol>
      <form className="checkout-layout" onSubmit={placeOrder} noValidate>
        <div className="checkout-form">
          <h2>Delivery details</h2>
          <div className="form-field">
            <label htmlFor="co-full-name">Full name</label>
            <input id="co-full-name" className="form-control" value={fields.fullName} onChange={event => updateField('fullName', event.target.value)} autoComplete="name" required />
          </div>
          <div className="form-field">
            <label htmlFor="co-phone">Phone number</label>
            <input id="co-phone" className="form-control" type="tel" value={fields.phone} onChange={event => updateField('phone', event.target.value)} autoComplete="tel" required />
          </div>
          <div className="form-field">
            <label htmlFor="co-street">Street address</label>
            <input id="co-street" className="form-control" value={fields.street} onChange={event => updateField('street', event.target.value)} autoComplete="street-address" required />
          </div>
          <div className="form-row-2">
            <div className="form-field">
              <label htmlFor="co-city">City</label>
              <input id="co-city" className="form-control" value={fields.city} onChange={event => updateField('city', event.target.value)} autoComplete="address-level2" required />
            </div>
            <div className="form-field">
              <label htmlFor="co-lga">Local government area</label>
              <input id="co-lga" className="form-control lga-input" value={fields.localGovernment} onChange={event => updateField('localGovernment', event.target.value)} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="co-state">State</label>
            <select id="co-state" className="form-control state-select" value={fields.state} onChange={event => updateField('state', event.target.value)} required>
              <option value="">Select your state</option>
              {states.map(state => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>

          {quoteBusy && <p className="quote-box" role="status">Checking delivery to {fields.state}…</p>}
          {quote && (
            <div className="quote-box">
              <div className="quote-row"><span>{quote.zoneName} zone</span><span>Delivery to {quote.stateName}</span></div>
              <div className="quote-row"><span>Delivery fee</span><span>{quote.feeKobo === 0 ? 'Free' : formatNaira(quote.feeKobo)}</span></div>
              {quote.allItemsFreeShipping && <p><span className="badge badge-free-ship">All items ship free</span></p>}
              {quote.digitalOnly && <p>Digital order, no delivery fee.</p>}
            </div>
          )}
          {!quoteBusy && !quote && fields.state && (
            <p className="quote-box">We do not deliver to {fields.state} yet. <Link className="text-link" href="/contact">Contact support</Link> and we will help you complete the order.</p>
          )}
          {quoteError && <p className="form-error" role="alert">{quoteError}</p>}

          <h2>Payment method</h2>
          <div className="payment-choice" aria-label="Choose a payment method">
            {providers.map(option => (
              <button
                key={option}
                type="button"
                className={provider === option ? 'payment-option selected' : 'payment-option'}
                onClick={() => setProvider(option)}
                aria-pressed={provider === option}
              >
                {option === 'paystack' ? 'Pay with Paystack' : option === 'flutterwave' ? 'Pay with Flutterwave' : option}
              </button>
            ))}
            {providers.length === 0 && <p>No payment provider is available right now. Please try again shortly.</p>}
          </div>

          <div className="gift-card-row">
            <label htmlFor="co-gift-card">Gift card code (optional)</label>
            <input id="co-gift-card" className="form-control" value={giftCardCode} onChange={event => { setGiftCardCode(event.target.value); setGiftCardBalance(null); setGiftCardError(''); }} placeholder="Enter a gift card code" autoComplete="off" />
            <button type="button" className="button small" onClick={checkGiftCard} disabled={giftCardBusy || !giftCardCode.trim()}>{giftCardBusy ? 'Checking…' : 'Check'}</button>
            {giftCardBalance !== null && <p role="status">Gift card balance: {formatNaira(giftCardBalance)}. It will be applied when you place the order.</p>}
            {giftCardError && <p className="form-error" role="alert">{giftCardError}</p>}
          </div>
        </div>

        <aside className="cart-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          {cart.lines.map(line => (
            <div className="summary-row" key={line.id}><span>{line.title} × {line.quantity}</span><span>{formatNaira(line.lineTotalKobo)}</span></div>
          ))}
          <div className="place-order-bar">
            <div className="summary-row"><span>Subtotal</span><span>{formatNaira(subtotal)}</span></div>
            {discount > 0 && <div className="summary-row"><span>Discount{cart.totals.couponCode ? ` (${cart.totals.couponCode})` : ''}</span><span>-{formatNaira(discount)}</span></div>}
            <div className="summary-row"><span>Delivery</span><span>{quoteBusy ? 'Checking…' : quote ? (quote.feeKobo === 0 ? 'Free' : formatNaira(quote.feeKobo)) : 'Select your state'}</span></div>
            <div className="summary-total"><span>Total</span><span>{formatNaira(total)}</span></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="button" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
          </div>
        </aside>
      </form>
    </section>
  );
}
