'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { apiRequest, ApiError } from '@/lib/services/http';
import type { ListingDetail } from '@/lib/services/store/types';
import { WishlistButton } from './wishlist-button';

export function AddToCart({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const attribute of listing.attributes) initial[attribute.slug] = '';
    return initial;
  });
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [signInRequired, setSignInRequired] = useState(false);

  const outOfStock = listing.trackStock && listing.stockQuantity === 0;
  const lowStock = !outOfStock && listing.trackStock && listing.stockQuantity > 0 && listing.stockQuantity <= listing.lowStockThreshold;
  const maxQty = listing.trackStock ? Math.max(1, listing.stockQuantity) : 99;

  function select(slug: string, label: string) {
    setSelections(prev => ({ ...prev, [slug]: prev[slug] === label ? '' : label }));
    setDone(false);
  }

  function validate(): string | null {
    const missing = listing.attributes.filter(attribute => attribute.isRequired && !selections[attribute.slug]?.trim());
    if (missing.length > 0) return `Please choose ${missing.map(attribute => attribute.name.toLowerCase()).join(', ')} before continuing.`;
    if (listing.trackStock && qty > listing.stockQuantity) return `Only ${listing.stockQuantity} of this item are in stock.`;
    return null;
  }

  async function addToCart(): Promise<boolean> {
    const validationError = validate();
    if (validationError) { setError(validationError); return false; }
    setBusy(true);
    setError('');
    setSignInRequired(false);
    try {
      await apiRequest('/api/store/cart', { method: 'POST', body: JSON.stringify({ listingId: listing.id, quantity: qty, selectedAttributes: selections }) });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setSignInRequired(true);
      else setError(err instanceof Error ? err.message : 'This item could not be added to your cart.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    setDone(await addToCart());
  }

  async function handleBuyNow() {
    if (await addToCart()) router.push('/checkout');
  }

  return (
    <div className="add-to-cart-panel">
      {listing.attributes.map(attribute => (
        <div className="attribute-group" key={attribute.attributeId}>
          <p className="attribute-label">{attribute.name}{attribute.isRequired ? ' (required)' : ''}</p>
          <div className="attribute-options" role="group" aria-label={`Choose ${attribute.name}`}>
            {attribute.options.map(option => (
              <button
                key={option.valueId}
                type="button"
                className={selections[attribute.slug] === option.label ? 'attribute-option selected' : 'attribute-option'}
                aria-pressed={selections[attribute.slug] === option.label}
                onClick={() => select(attribute.slug, option.label)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="qty-stepper">
        <button type="button" className="qty-btn" onClick={() => setQty(value => Math.max(1, value - 1))} disabled={outOfStock || qty <= 1} aria-label="Decrease quantity"><Minus size={16} aria-hidden="true" /></button>
        <span className="qty-value" aria-live="polite">{qty}</span>
        <button type="button" className="qty-btn" onClick={() => setQty(value => Math.min(maxQty, value + 1))} disabled={outOfStock || qty >= maxQty} aria-label="Increase quantity"><Plus size={16} aria-hidden="true" /></button>
      </div>
      <div className="buy-actions">
        <button type="button" className="button" onClick={handleAdd} disabled={busy || outOfStock}>
          <ShoppingCart size={16} aria-hidden="true" /> {busy ? 'Adding…' : 'Add to cart'}
        </button>
        <button type="button" className="button secondary" onClick={handleBuyNow} disabled={busy || outOfStock}>Buy now</button>
        <WishlistButton listingId={listing.id} />
      </div>
      {outOfStock && <p className="stock-note out">Out of stock</p>}
      {lowStock && <p className="stock-note low">Only {listing.stockQuantity} left</p>}
      {listing.isDigital && <p className="stock-note">Delivered digitally after payment.</p>}
      {done && !error && <p role="status">Added ✓ <Link className="text-link" href="/cart">View cart</Link></p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {signInRequired && (
        <p className="form-error" role="alert">Please <Link className="text-link" href={`/login?next=${encodeURIComponent(`/store/listing/${listing.slug}`)}`}>sign in</Link> to add items to your cart.</p>
      )}
    </div>
  );
}
