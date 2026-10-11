'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getDisplayImage } from '@/lib/media';

export const ARTICLE_CATEGORIES = [
  'General', 'Nursing Fundamentals', 'Digital Health', 'Health Informatics',
  'Artificial Intelligence in Healthcare', 'Patient Monitoring Technology',
  'Electronic Health Records', 'Telehealth', 'Medical Devices',
  'Nursing Research', 'Career Development', 'News',
];

type Article = { id: string; slug: string; title: string; excerpt: string; published_at: string | null; featured_media_url: string | null; featured_media_alt?: string | null; categories?: string | null };
function dateLabel(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
export default function BlogBrowser({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sort, setSort] = useState('newest');
  const categories = useMemo(() => ['All categories', ...ARTICLE_CATEGORIES], []);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter(a => {
      const names = (a.categories || '').split('||').filter(Boolean);
      const matchesCategory = category === 'All categories' || names.includes(category);
      const matchesQuery = !q || `${a.title} ${a.excerpt} ${names.join(' ')}`.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    }).sort((a,b) => sort === 'oldest'
      ? new Date(a.published_at || 0).getTime() - new Date(b.published_at || 0).getTime()
      : new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
  }, [articles, query, category, sort]);
  return <section className="blog-browser" aria-label="Browse articles">
    <div className="blog-controls">
      <label className="blog-search"><span>Search articles</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topics, articles, or keywords" type="search" /></label>
      <label><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <label><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
    </div>
    <div className="category-chips" aria-label="Filter by category">
      {categories.map(c => <button type="button" key={c} className={category === c ? 'category-chip active' : 'category-chip'} onClick={() => setCategory(c)}>{c}</button>)}
    </div>
    <p className="results-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'article' : 'articles'} found</p>
    {filtered.length ? <div className="blog-article-grid">{filtered.map(a => <article className="blog-article-card" key={a.id}>
      <Link href={`/blog/${a.slug}`} className="blog-card-image" aria-label={`Read ${a.title}`}>
        <img src={getDisplayImage(a.featured_media_url)} alt={a.featured_media_alt || ''} />
      </Link>
      <div className="blog-card-content">
        <div className="blog-card-categories">{(a.categories || '').split('||').filter(Boolean).map(c => <button key={c} type="button" onClick={() => setCategory(c)}>{c}</button>)}</div>
        {dateLabel(a.published_at) && <time className="home-article-date" dateTime={a.published_at || undefined}>{dateLabel(a.published_at)}</time>}
        <h2><Link href={`/blog/${a.slug}`}>{a.title}</Link></h2>
        {a.excerpt && <p>{a.excerpt}</p>}
        <Link className="read-article-link" href={`/blog/${a.slug}`}>Read article <span aria-hidden="true">→</span></Link>
      </div>
    </article>)}</div> : <div className="notice-card"><strong>No articles match those filters.</strong><p>Try another search term or choose a different category.</p><button className="button secondary" onClick={() => { setQuery(''); setCategory('All categories'); }}>Clear filters</button></div>}
  </section>;
}
