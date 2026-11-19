'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { apiRequest, ApiError } from '@/lib/services/http';

export function WishlistButton({ listingId, initialAdded = false }: { listingId: string; initialAdded?: boolean }) {
  const router = useRouter();
  const [added, setAdded] = useState(initialAdded);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiRequest<{ added: boolean }>('/api/store/wishlist', { method: 'POST', body: JSON.stringify({ listingId }) });
      setAdded(data.added);
      if (!data.added && initialAdded) router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/login?next=${encodeURIComponent('/store')}`);
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="button secondary small"
      onClick={toggle}
      disabled={busy}
      aria-pressed={added}
      aria-label={added ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <Heart size={16} fill={added ? 'currentColor' : 'none'} aria-hidden="true" />
      {added ? 'Saved' : 'Save'}
    </button>
  );
}
