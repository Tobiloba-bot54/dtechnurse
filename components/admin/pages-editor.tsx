// File: DTECHNURSE-SITE-main/components/admin/pages-editor.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';

type EditablePage = { id: string; slug: string; title: string; body_html: string; seo_title?: string | null; seo_description?: string | null; updated_at?: string };

const KNOWN_PAGES: Array<{ slug: string; label: string }> = [
  { slug: 'about', label: 'About' },
  { slug: 'privacy', label: 'Privacy policy' },
  { slug: 'terms', label: 'Terms of service' },
  { slug: 'contact', label: 'Contact (intro text)' },
];

export default function PagesEditor() {
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [activeSlug, setActiveSlug] = useState(KNOWN_PAGES[0].slug);
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/pages', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load pages.');
      setPages(data.pages || []);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load pages.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const existing = pages.find(p => p.slug === activeSlug);
    setTitle(existing?.title || '');
    setBodyHtml(existing?.body_html || '');
    setSeoTitle(existing?.seo_title || '');
    setSeoDescription(existing?.seo_description || '');
    setNotice(existing ? '' : 'This page still shows its built-in default copy. Save to make it admin-editable.');
  }, [activeSlug, pages]);

  const save = async () => {
    setBusy(true); setNotice('Saving…');
    try {
      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: activeSlug, title, bodyHtml, seoTitle, seoDescription }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setNotice('Page saved.');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const revertToDefault = async () => {
    const existing = pages.find(p => p.slug === activeSlug);
    if (!existing) { setNotice('Already using the built-in default.'); return; }
    setBusy(true); setNotice('Reverting…');
    try {
      const response = await fetch(`/api/admin/pages/${encodeURIComponent(existing.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not revert.');
      setNotice('Reverted to the built-in default copy.');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not revert.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel admin-pages-editor">
      <h3>Pages</h3>
      <p className="admin-muted">Edit the About, Privacy and Contact pages. A page keeps showing its built-in copy until you save it here.</p>
      <div className="admin-pages-tabs" role="tablist" aria-label="Editable pages">
        {KNOWN_PAGES.map(p => (
          <button
            key={p.slug}
            type="button"
            role="tab"
            aria-selected={activeSlug === p.slug}
            className={`admin-pages-tab ${activeSlug === p.slug ? 'active' : ''}`}
            onClick={() => setActiveSlug(p.slug)}
          >
            {p.label}
            {pages.some(pg => pg.slug === p.slug) && <span className="admin-pages-tab-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>
      {notice && <p className="admin-status-message" role="status">{notice}</p>}
      <label className="admin-field">Page title<input value={title} maxLength={180} onChange={e => setTitle(e.target.value)} placeholder="Page title" /></label>
      <label className="admin-field">Page content (HTML)<textarea className="admin-source-editor admin-pages-html" value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={12} spellCheck={false} placeholder="<h2>Section</h2><p>Body copy…</p>" /></label>
      <details className="admin-seo-fields-wrap">
        <summary>SEO metadata</summary>
        <div className="admin-seo-fields">
          <label className="admin-field">SEO title<input value={seoTitle} maxLength={180} onChange={e => setSeoTitle(e.target.value)} /></label>
          <label className="admin-field">SEO description<textarea value={seoDescription} maxLength={320} rows={2} onChange={e => setSeoDescription(e.target.value)} /></label>
        </div>
      </details>
      <div className="admin-pages-actions">
        <button type="button" className="button secondary small" disabled={busy} onClick={revertToDefault}>Revert to default</button>
        <button type="button" className="button small" disabled={busy || !title} onClick={save}>Save page</button>
      </div>
    </section>
  );
}
