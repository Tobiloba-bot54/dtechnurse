'use client';
import { useState } from 'react';
import type { ListingImage } from '@/lib/services/store/types';

const LOGO_FALLBACK = '/dtechnurse-logo.jpg';

export function ListingGallery({ images, title }: { images: ListingImage[]; title: string }) {
  const gallery = images.length > 0 ? images : [{ id: 'fallback', url: LOGO_FALLBACK, alt: title, isPrimary: true }];
  const [activeIndex, setActiveIndex] = useState(() => {
    const primary = gallery.findIndex(image => image.isPrimary);
    return primary >= 0 ? primary : 0;
  });
  const active = gallery[Math.min(activeIndex, gallery.length - 1)] ?? gallery[0];
  return (
    <div className="listing-gallery">
      <div className="gallery-main">
        <img src={active.url || LOGO_FALLBACK} alt={active.alt || title} />
      </div>
      {gallery.length > 1 && (
        <div className="gallery-thumbs" aria-label="Product images">
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              className={index === activeIndex ? 'gallery-thumb active' : 'gallery-thumb'}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${gallery.length}`}
              aria-pressed={index === activeIndex}
            >
              <img src={image.url || LOGO_FALLBACK} alt={image.alt || title} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
