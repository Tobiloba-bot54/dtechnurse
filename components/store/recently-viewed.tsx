'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatNaira } from '@/lib/services/store/types';

export type RecentlyViewItem = { slug: string; title: string; priceKobo: number; imageUrl: string };

const STORAGE_KEY = 'dtechnurse_recently_viewed';
const MAX_ITEMS = 8;
const LOGO_FALLBACK = '/dtechnurse-logo.jpg';

function readRecent(): RecentlyViewItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentlyViewItem =>
      Boolean(entry) && typeof entry === 'object' && typeof (entry as RecentlyViewItem).slug === 'string' && typeof (entry as RecentlyViewItem).title === 'string');
  } catch {
    return [];
  }
}

export function RecentlyViewed({ mode, item }: { mode: 'track' | 'rail'; item?: RecentlyViewItem }) {
  const [items, setItems] = useState<RecentlyViewItem[]>([]);

  useEffect(() => {
    if (mode === 'track') {
      if (!item || !item.slug) return;
      try {
        const rest = readRecent().filter(entry => entry.slug !== item.slug);
        const next = [{ slug: item.slug, title: item.title, priceKobo: item.priceKobo, imageUrl: item.imageUrl || LOGO_FALLBACK }, ...rest].slice(0, MAX_ITEMS);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* localStorage unavailable, skip tracking. */ }
      return;
    }
    setItems(readRecent());
  }, [mode, item]);

  if (mode !== 'rail' || items.length === 0) return null;
  return (
    <section className="recently-viewed" aria-label="Recently viewed products">
      <h2>Recently viewed</h2>
      <div className="recently-track">
        {items.map(entry => (
          <Link key={entry.slug} className="mini-card" href={`/store/listing/${entry.slug}`}>
            <span className="mini-card-media"><img src={entry.imageUrl || LOGO_FALLBACK} alt="" loading="lazy" /></span>
            <span className="mini-card-title">{entry.title}</span>
            <span className="mini-card-price">{formatNaira(entry.priceKobo)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
