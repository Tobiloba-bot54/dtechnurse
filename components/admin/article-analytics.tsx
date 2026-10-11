'use client';
import { useEffect, useState } from 'react';
type Analytics = { totalViews: number; dailyViews: Array<{ day: string; views: number }>; popularArticles: Array<{ id: string; title: string; slug: string; views: number }>; categories: Array<{ name: string; articles: number }> };
export default function ArticleAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; fetch('/api/admin/analytics', { cache: 'no-store' }).then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.error || 'Analytics unavailable.'); if (active) setData(json); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Analytics unavailable.'); }); return () => { active = false; }; }, []);
  return <section className="admin-panel admin-workspace"><div className="admin-editor-heading"><div><span className="eyebrow">CONTENT PERFORMANCE</span><h2>Article analytics</h2></div></div>
    {error && <p className="form-error" role="alert">{error}</p>}{!data && !error && <p className="admin-muted">Loading analytics...</p>}
    {data && <><div className="analytics-summary"><div className="admin-stat-card"><span>Recorded article views</span><strong>{data.totalViews.toLocaleString()}</strong></div><div className="admin-stat-card"><span>Views in the last 14 days</span><strong>{data.dailyViews.reduce((sum, item) => sum + item.views, 0).toLocaleString()}</strong></div></div>
      <div className="analytics-grid"><div><h3>Daily views</h3>{data.dailyViews.length ? <div className="analytics-bars" aria-label="Article views per day">{data.dailyViews.map(item => <div className="analytics-bar-item" key={item.day} title={`${item.day}: ${item.views} views`}><span style={{ height: `${Math.max(3, item.views / Math.max(1, ...data.dailyViews.map(v => v.views)) * 100)}%` }} /><small>{item.day.slice(5)}</small></div>)}</div> : <p className="admin-muted">No view data yet.</p>}</div>
      <div><h3>Most-read articles</h3>{data.popularArticles.length ? <ol className="analytics-popular">{data.popularArticles.map(item => <li key={item.id}><a href={`/blog/${item.slug}`} target="_blank" rel="noreferrer">{item.title}</a><strong>{item.views}</strong></li>)}</ol> : <p className="admin-muted">No article views yet.</p>}</div></div>
      <div className="analytics-category-list"><h3>Articles by category</h3>{data.categories.map(item => <span key={item.name}>{item.name}: <strong>{item.articles}</strong></span>)}</div>
      <p className="admin-muted">Views are approximate and deduplicated per article per browser session for the current day. Automated traffic may affect totals.</p></>}
  </section>;
}
