'use client';

import { useEffect, useMemo, useState } from 'react';

type Heading = { id: string; text: string; level: number };

function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80) || 'section';
}

export default function ArticleReader({ articleId, bodyHtml, title }: { articleId: string; bodyHtml: string; title: string }) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [progress, setProgress] = useState(0);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    const root = document.getElementById('article-body');
    if (!root) return;
    const used = new Set<string>();
    const found = Array.from(root.querySelectorAll('h2, h3')).map((node) => {
      const text = (node.textContent || '').trim();
      const base = slugify(text);
      let id = base;
      let suffix = 2;
      while (used.has(id) || document.getElementById(id)) id = `${base}-${suffix++}`;
      used.add(id);
      node.id = id;
      return { id, text, level: Number(node.tagName.slice(1)) };
    }).filter(item => item.text);
    setHeadings(found);

    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = root.getBoundingClientRect();
        const total = root.scrollHeight - window.innerHeight * 0.6;
        const travelled = Math.max(0, -rect.top + window.innerHeight * 0.2);
        setProgress(total > 0 ? Math.min(100, Math.round((travelled / total) * 100)) : 100);
      });
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => { window.removeEventListener('scroll', updateProgress); cancelAnimationFrame(frame); };
  }, [bodyHtml]);

  useEffect(() => {
    try {
      const key = `dtechnurse-view-${articleId}-${new Date().toISOString().slice(0, 10)}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      void fetch('/api/analytics/view', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }), keepalive: true,
      }).catch(() => undefined);
    } catch { /* Private browsing may block storage. Analytics is optional. */ }
  }, [articleId]);

  const shareUrl = useMemo(() => typeof window === 'undefined' ? '' : window.location.href, []);
  async function share() {
    setShareMessage('');
    try {
      if (navigator.share) await navigator.share({ title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setShareMessage('Article link copied.'); }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') setShareMessage('Sharing is unavailable in this browser.');
    }
  }

  return <>
    <div className="article-reading-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
    <div className="article-tools" aria-label="Article tools">
      <button type="button" className="button secondary" onClick={share}>Share article</button>
      <button type="button" className="button secondary" onClick={() => window.print()}>Print article</button>
      <button type="button" className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(shareUrl || window.location.href); setShareMessage('Article link copied.'); } catch { setShareMessage('Could not copy the link.'); } }}>Copy link</button>
    </div>
    {shareMessage && <p className="form-success" role="status">{shareMessage}</p>}
    {headings.length > 2 && <nav className="article-toc" aria-label="Table of contents">
      <h2>In this article</h2>
      <ol>{headings.map(item => <li key={item.id} className={item.level === 3 ? 'article-toc-sub' : ''}><a href={`#${item.id}`}>{item.text}</a></li>)}</ol>
    </nav>}
    <div id="article-body" className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  </>;
}
