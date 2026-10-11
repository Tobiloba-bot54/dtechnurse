'use client';
import { useEffect, useState } from 'react';

type CalendarArticle = { id: string; title: string; slug: string; status: string; published_at: string | null; updated_at: string };
export default function EditorialCalendar() {
  const [articles, setArticles] = useState<CalendarArticle[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/admin/calendar', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load calendar.');
      if (active) setArticles(data.articles || []);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load calendar.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const scheduled = articles.filter(item => item.status === 'scheduled').sort((a,b) => String(a.published_at).localeCompare(String(b.published_at)));
  const drafts = articles.filter(item => item.status === 'draft');
  const published = articles.filter(item => item.status === 'published');
  return <section className="admin-panel admin-workspace">
    <div className="admin-editor-heading"><div><span className="eyebrow">CONTENT PLANNING</span><h2>Editorial calendar</h2></div><button className="button secondary" onClick={() => { setLoading(true); fetch('/api/admin/calendar', { cache: 'no-store' }).then(r => r.json()).then(d => setArticles(d.articles || [])).catch(() => setError('Could not refresh calendar.')).finally(() => setLoading(false)); }}>Refresh</button></div>
    {loading && <p className="admin-muted">Loading content schedule...</p>}{error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && <div className="calendar-columns">
      <CalendarColumn title="Scheduled" items={scheduled} empty="No scheduled articles." />
      <CalendarColumn title="Drafts to finish" items={drafts} empty="No drafts waiting." />
      <CalendarColumn title="Published" items={published.slice(0, 10)} empty="No published articles yet." />
    </div>}
  </section>;
}
function CalendarColumn({ title, items, empty }: { title: string; items: CalendarArticle[]; empty: string }) {
  return <div className="calendar-column"><h3>{title} <span>{items.length}</span></h3>{items.length === 0 ? <p className="admin-muted">{empty}</p> : <ul>{items.map(item => <li key={item.id}><strong>{item.title}</strong><span>{item.status === 'scheduled' && item.published_at ? new Date(item.published_at).toLocaleString() : item.status === 'published' && item.published_at ? `Published ${new Date(item.published_at).toLocaleDateString()}` : `Updated ${new Date(item.updated_at).toLocaleDateString()}`}</span></li>)}</ul>}</div>;
}
