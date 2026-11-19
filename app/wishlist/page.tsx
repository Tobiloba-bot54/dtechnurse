import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { getWishlist } from '@/lib/services/store/engagement';
import { ListingCard } from '@/components/store/listing-card';
import { WishlistButton } from '@/components/store/wishlist-button';

export const metadata = { title: 'My wishlist | DTECHNURSE' };

export default async function WishlistPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/wishlist')}`);
  const items = await getWishlist(data.user.id).catch(() => []);
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>My wishlist</h1>
      <p className="lead">Products you saved for later. Remove anything you no longer need.</p>
      {items.length === 0 ? (
        <div className="empty-state">
          <Heart className="empty-state-icon" aria-hidden="true" />
          <h2>Your wishlist is empty</h2>
          <p>Tap the save button on any product to keep it here for later.</p>
          <Link className="button" href="/store">Browse the store</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {items.map(item => (
            <div key={item.id}>
              <ListingCard listing={item.listing} />
              <WishlistButton listingId={item.listing.id} initialAdded />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
