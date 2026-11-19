import Link from 'next/link';
import { formatNaira, type ListingSummary } from '@/lib/services/store/types';

const LOGO_FALLBACK = '/dtechnurse-logo.jpg';

export function ListingCard({ listing }: { listing: ListingSummary }) {
  const outOfStock = listing.trackStock && listing.stockQuantity === 0;
  const lowStock = !outOfStock && listing.trackStock && listing.stockQuantity > 0 && listing.stockQuantity <= listing.lowStockThreshold;
  const currentPrice = listing.activeDeal ? listing.activeDeal.priceKobo : listing.priceKobo;
  const compareAt = listing.compareAtPriceKobo !== null && listing.compareAtPriceKobo > currentPrice ? listing.compareAtPriceKobo : null;
  return (
    <article className="product-card">
      <Link className="product-card-media" href={`/store/listing/${listing.slug}`} aria-label={`View ${listing.title}`}>
        <img src={listing.primaryImageUrl || LOGO_FALLBACK} alt={listing.title} loading="lazy" />
        {listing.activeDeal && <span className="badge badge-deal">Deal</span>}
        {!outOfStock && listing.isFreeShipping && <span className="badge badge-free-ship">Free shipping</span>}
        {listing.isDigital && <span className="badge badge-digital">Digital</span>}
        {outOfStock && <span className="badge badge-out">Out of stock</span>}
        {lowStock && <span className="badge badge-low">Low stock</span>}
      </Link>
      <div className="product-card-body">
        <h3 className="product-card-title"><Link href={`/store/listing/${listing.slug}`}>{listing.title}</Link></h3>
        <p className="product-price">
          <span className="product-price-current">{formatNaira(currentPrice)}</span>
          {compareAt !== null && <span className="product-price-compare">{formatNaira(compareAt)}</span>}
        </p>
        <p className="product-rating">
          {listing.ratingCount > 0
            ? <span className="rating-stars">★ {listing.ratingAverage.toFixed(1)} ({listing.ratingCount})</span>
            : <span className="rating-stars">No reviews yet</span>}
        </p>
        <p className="product-card-meta">{listing.categoryName}</p>
      </div>
    </article>
  );
}
