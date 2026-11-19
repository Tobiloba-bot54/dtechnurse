import { StoreBrowser } from '@/components/store/store-browser';

export const metadata = {
  title: 'Search the store | DTECHNURSE',
  description: 'Search nursing kits, scrubs, devices, and digital products in the DTECHNURSE store.',
};

export default async function StoreSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim() : '';
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">STORE SEARCH</span>
      <h1>{query ? `Search results for "${query}"` : 'Search the store'}</h1>
      <p className="lead">{query ? 'Here is everything that matches your search. Refine it below to narrow things down.' : 'Type in the search box below to find products across the whole store.'}</p>
      <StoreBrowser initialQuery={query} />
    </main>
  );
}
