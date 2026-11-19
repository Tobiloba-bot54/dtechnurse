import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListingBySlug } from '@/lib/services/store/catalog';
import { formatNaira } from '@/lib/services/store/types';
import { ListingGallery } from '@/components/store/listing-gallery';
import { AddToCart } from '@/components/store/add-to-cart';
import { ListingCard } from '@/components/store/listing-card';
import { RecentlyViewed } from '@/components/store/recently-viewed';

export const revalidate = 60;
type Params = { slug: string };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug).catch(() => null);
  if (!listing) return { title: 'Product not found | DTECHNURSE' };
  const description = listing.description ? listing.description.slice(0, 155) : `Buy ${listing.title} at the DTECHNURSE store.`;
  return { title: `${listing.title} | DTECHNURSE Store`, description };
}

export default async function ListingPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug).catch(() => null);
  if (!listing) notFound();

  const currentPrice = listing.activeDeal ? listing.activeDeal.priceKobo : listing.priceKobo;
  const compareAt = listing.compareAtPriceKobo !== null && listing.compareAtPriceKobo > currentPrice ? listing.compareAtPriceKobo : null;
  const outOfStock = listing.trackStock && listing.stockQuantity === 0;
  const lowStock = !outOfStock && listing.trackStock && listing.stockQuantity > 0 && listing.stockQuantity <= listing.lowStockThreshold;
  const descriptionParagraphs = listing.description.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);

  return (
    <main className="content-page store-shell">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span aria-hidden="true">/</span>
        <Link href="/store">Store</Link><span aria-hidden="true">/</span>
        {listing.categorySlug
          ? <><Link href={`/store/category/${listing.categorySlug}`}>{listing.categoryName}</Link><span aria-hidden="true">/</span></>
          : null}
        <span aria-current="page">{listing.title}</span>
      </nav>
      <div className="listing-layout">
        <ListingGallery images={listing.images} title={listing.title} />
        <div className="listing-info">
          <h1 className="listing-title">{listing.title}</h1>
          <p className="listing-meta">
            {listing.ratingCount > 0
              ? <><span className="rating-stars">★ {listing.ratingAverage.toFixed(1)}</span> · {listing.ratingCount} {listing.ratingCount === 1 ? 'review' : 'reviews'} · <Link href="#reviews">See reviews</Link></>
              : 'No reviews yet'}
            {listing.categorySlug && <> · <Link href={`/store/category/${listing.categorySlug}`}>{listing.categoryName}</Link></>}
          </p>
          <p className="product-price">
            <span className="product-price-current">{formatNaira(currentPrice)}</span>
            {compareAt !== null && <span className="product-price-compare">{formatNaira(compareAt)}</span>}
          </p>
          {compareAt !== null && <p className="savings-note">You save {formatNaira(compareAt - currentPrice)}</p>}
          <p>
            {!outOfStock && listing.isFreeShipping && <span className="badge badge-free-ship">Free shipping</span>}
            {listing.isDigital && <span className="badge badge-digital">Digital</span>}
            {lowStock && <span className="badge badge-low">Low stock</span>}
          </p>
          {outOfStock && <p className="stock-note out">Out of stock</p>}
          {!outOfStock && lowStock && <p className="stock-note low">Only {listing.stockQuantity} left</p>}
          <AddToCart listing={listing} />
          {listing.listingType === 'bundle' && listing.bundleItems.length > 0 && (
            <div className="bundle-box">
              <h2>What is inside this bundle</h2>
              {listing.bundleItems.map(item => (
                <div className="bundle-item" key={item.bundleItemId}>
                  <Link className="bundle-item-media" href={`/store/listing/${item.product.slug}`} aria-label={`View ${item.product.title}`}>
                    <img src={item.product.primaryImageUrl || '/dtechnurse-logo.jpg'} alt={item.product.title} loading="lazy" />
                  </Link>
                  <div className="bundle-item-body">
                    <p><Link href={`/store/listing/${item.product.slug}`}>{item.product.title}</Link></p>
                    <p>{item.quantity} × {formatNaira(item.product.priceKobo)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {descriptionParagraphs.length > 0 && (
            <section aria-label="Product description">
              <h2>Description</h2>
              {descriptionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </section>
          )}
          {listing.attributes.length > 0 && (
            <section aria-label="Available options">
              <h2>Available options</h2>
              {listing.attributes.map(attribute => (
                <p key={attribute.attributeId}><strong>{attribute.name}:</strong> {attribute.options.map(option => option.label).join(', ')}</p>
              ))}
            </section>
          )}
        </div>
      </div>

      <section className="related-section" id="reviews" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Customer reviews</h2>
        {listing.reviews.length === 0 ? (
          <p>No reviews yet. Bought this product? Your review helps other nurses choose well.</p>
        ) : (
          <div className="reviews-list">
            {listing.reviews.map(review => (
              <article className="review-card" key={review.id}>
                <div className="review-head">
                  <span className="review-stars" aria-label={`${review.rating} out of 5 stars`}>★ {review.rating}</span>
                  <strong>{review.title}</strong>
                </div>
                <p className="review-meta">{review.authorName}{formatDate(review.createdAt) ? ` · ${formatDate(review.createdAt)}` : ''}</p>
                <p>{review.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      {listing.related.length > 0 && (
        <section className="related-section" aria-labelledby="related-heading">
          <h2 id="related-heading">You may also like</h2>
          <div className="product-grid">
            {listing.related.map(item => <ListingCard key={item.id} listing={item} />)}
          </div>
        </section>
      )}

      <RecentlyViewed mode="track" item={{ slug: listing.slug, title: listing.title, priceKobo: currentPrice, imageUrl: listing.primaryImageUrl }} />
    </main>
  );
}
