'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';
import type { CategoryAttribute, CategorySummary, ListingSummary } from '@/lib/services/store/types';
import { ListingCard } from './listing-card';
import { SearchBox } from './search-box';
import { FiltersPanel } from './filters-panel';

type CatalogResponse = {
  listings: ListingSummary[];
  total: number;
  page: number;
  pages: number;
  categories: CategorySummary[];
  attributes?: CategoryAttribute[];
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

function buildPageList(current: number, pages: number): Array<number | 'gap'> {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const items: Array<number | 'gap'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pages - 1, current + 1);
  if (start > 2) items.push('gap');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < pages - 1) items.push('gap');
  items.push(pages);
  return items;
}

export function StoreBrowser({ categorySlug, initialQuery = '' }: { categorySlug?: string; initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string[]>>({});
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [attributes, setAttributes] = useState<CategoryAttribute[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const attributeKey = JSON.stringify(selectedAttributes);

  useEffect(() => {
    const selected: Record<string, string[]> = JSON.parse(attributeKey);
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (query.trim()) params.set('q', query.trim());
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', '12');
    for (const [slug, values] of Object.entries(selected)) for (const value of values) params.append(`attr_${slug}`, value);
    setLoading(true);
    setError('');
    apiRequest<CatalogResponse>(`/api/store/catalog?${params.toString()}`)
      .then(data => {
        setListings(Array.isArray(data.listings) ? data.listings : []);
        setCategories(Array.isArray(data.categories) ? data.categories : []);
        setAttributes(Array.isArray(data.attributes) ? data.attributes : []);
        setTotal(Number(data.total) || 0);
        setPages(Math.max(1, Number(data.pages) || 1));
      })
      .catch(err => {
        setListings([]);
        setError(err instanceof Error ? err.message : 'Products could not be loaded right now.');
      })
      .finally(() => { setLoading(false); });
  }, [categorySlug, query, sort, page, attributeKey]);

  useEffect(() => {
    setSelectedAttributes({});
    setPage(1);
  }, [categorySlug]);

  function goToPage(next: number) {
    if (next < 1 || next > pages || next === page) return;
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCategory(slug: string) {
    router.push(slug ? `/store/category/${slug}` : '/store');
  }

  const showPanel = attributes.length > 0 || categories.length > 0;
  const pageList = buildPageList(page, pages);

  return (
    <section className="store-browser" aria-label="Browse store products">
      <div className="store-grid-header">
        <SearchBox initialQuery={query} onSearch={term => { setQuery(term); setPage(1); }} />
        <div className="sort-bar">
          <label htmlFor="store-sort">Sort by</label>
          <select id="store-sort" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}>
            {SORT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>
      <div className="filters-layout">
        {showPanel && (
          <FiltersPanel
            attributes={attributes}
            selected={JSON.parse(attributeKey)}
            categories={categories}
            activeCategory={categorySlug}
            onChange={next => { setSelectedAttributes(next); setPage(1); }}
            onCategory={handleCategory}
          />
        )}
        <div id="products">
          {!loading && <p aria-live="polite">{total} {total === 1 ? 'product' : 'products'}{query.trim() ? ` matching "${query.trim()}"` : ''}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {loading && <p role="status" aria-live="polite">Loading products…</p>}
          {!loading && !error && listings.length === 0 && (
            <div className="empty-state">
              <Package className="empty-state-icon" aria-hidden="true" />
              <h2>No products found</h2>
              <p>Try a different search term, clear your filters, or browse another category.</p>
              <button type="button" className="button secondary small" onClick={() => { setQuery(''); setSelectedAttributes({}); setPage(1); }}>Clear filters</button>
            </div>
          )}
          {!loading && listings.length > 0 && (
            <>
              <div className="product-grid">
                {listings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
              </div>
              {pages > 1 && (
                <nav className="pagination" aria-label="Product pages">
                  <button type="button" className="page-btn" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" /></button>
                  {pageList.map((entry, index) => entry === 'gap'
                    ? <span key={`gap-${index}`} aria-hidden="true">…</span>
                    : <button key={entry} type="button" className={entry === page ? 'page-btn active' : 'page-btn'} onClick={() => goToPage(entry)} aria-current={entry === page ? 'page' : undefined}>{entry}</button>)}
                  <button type="button" className="page-btn" onClick={() => goToPage(page + 1)} disabled={page >= pages} aria-label="Next page"><ChevronRight size={16} aria-hidden="true" /></button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
