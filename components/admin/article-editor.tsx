// File: DTECHNURSE-SITE-main/components/admin/article-editor.tsx
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type Article = { id: string; slug: string; title: string; excerpt: string; body_html?: string; status: string; seo_title?: string | null; seo_description?: string | null; canonical_url?: string | null; featured_media_id?: string | null; editor_id?: string | null; published_at?: string | null; category_ids?: string[] };
type Category = { id: string; name: string; slug: string; description: string };
type Revision = { id: string; title: string; excerpt: string; body_html: string; created_at: string };
type Media = { id: string; public_url: string; alt_text: string; caption: string; mime_type: string; size_bytes: number };
type EditorProfile = { id: string; display_name: string; status: string };
const toLocalDateTime = (value: string) => { const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); };
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);

export default function ArticleEditor() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('draft');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [featuredMediaId, setFeaturedMediaId] = useState('');
  const [editorId, setEditorId] = useState('');
  const [editors, setEditors] = useState<EditorProfile[]>([]);
  const [newsletterNotice, setNewsletterNotice] = useState('');
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [mode, setMode] = useState<'visual' | 'source' | 'preview'>('visual');
  const [source, setSource] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<((nextStatus?: string) => Promise<void>) | null>(null);
  const readBody = () => mode === 'source' ? source : editorRef.current?.innerHTML ?? source;

  const loadArticles = useCallback(async () => {
    const response = await fetch('/api/admin/articles', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load articles.');
    setArticles(data.articles || []);
  }, []);
  const loadMedia = useCallback(async (refresh = false) => {
    if (mediaLoaded && !refresh) return;
    setMediaLoading(true);
    try {
      const response = await fetch('/api/admin/media', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the media library.');
      setMedia(data.media || []);
      setMediaLoaded(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load the media library.');
    } finally {
      setMediaLoading(false);
    }
  }, [mediaLoaded]);
  useEffect(() => { loadArticles().catch(e => setNotice(e instanceof Error ? e.message : 'Could not load articles.')); }, [loadArticles]);
  useEffect(() => { fetch('/api/admin/categories', { cache: 'no-store' }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Could not load categories.'); setCategories(data.categories || []); }).catch(e => setNotice(e instanceof Error ? e.message : 'Could not load categories.')); }, []);
  useEffect(() => {
    fetch('/api/admin/editors', { cache: 'no-store' }).then(r => r.json()).then(data => setEditors(data.editors || [])).catch(() => {});
  }, []);

  const reset = () => {
    setSelectedId(''); setTitle(''); setSlug(''); setSlugTouched(false); setExcerpt(''); setStatus('draft'); setSeoTitle(''); setSeoDescription(''); setCanonicalUrl(''); setFeaturedMediaId(''); setEditorId(''); setSource(''); setNewsletterNotice(''); setCategoryIds([]); setScheduledAt(''); setRevisions([]); setRevisionsOpen(false);
    if (editorRef.current) editorRef.current.innerHTML = '';
    setMode('visual'); setNotice('New draft ready.');
  };
  const openArticle = async (id: string) => {
    setBusy(true); setNotice('Loading article…');
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load article.');
      const a: Article = data.article;
      setSelectedId(a.id); setTitle(a.title); setSlug(a.slug); setSlugTouched(true); setExcerpt(a.excerpt || ''); setStatus(a.status); setSeoTitle(a.seo_title || ''); setSeoDescription(a.seo_description || ''); setCanonicalUrl(a.canonical_url || ''); setFeaturedMediaId(a.featured_media_id || ''); setEditorId(a.editor_id || ''); setSource(a.body_html || ''); setCategoryIds(a.category_ids || []); setScheduledAt(a.published_at ? toLocalDateTime(a.published_at) : ''); setRevisions([]); setRevisionsOpen(false);
      if (editorRef.current) editorRef.current.innerHTML = a.body_html || '';
      setMode('visual'); setNotice(`Loaded “${a.title}”.`); setNewsletterNotice('');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not load article.'); }
    finally { setBusy(false); }
  };
  const insertHtml = (html: string) => {
    if (mode === 'source') { setSource(v => `${v}${html}`); return; }
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0); range.deleteContents(); const fragment = range.createContextualFragment(html); const last = fragment.lastChild; range.insertNode(fragment); if (last) { range.setStartAfter(last); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); }
    } else editorRef.current?.insertAdjacentHTML('beforeend', html);
    if (editorRef.current) setSource(editorRef.current.innerHTML);
  };
  const command = (name: string, value?: string) => { if (mode !== 'visual') return; editorRef.current?.focus(); document.execCommand(name, false, value); if (editorRef.current) setSource(editorRef.current.innerHTML); };
  const changeMode = (next: 'visual' | 'source' | 'preview') => {
    if (mode === 'visual' && editorRef.current) setSource(editorRef.current.innerHTML);
    if (next === 'visual' && editorRef.current) editorRef.current.innerHTML = source;
    setMode(next);
  };
  const save = async (nextStatus = status) => {
    setBusy(true); setNotice('Saving…');
    const bodyHtml = readBody();
    const payload = { title, slug, excerpt, bodyHtml, status: nextStatus, seoTitle, seoDescription, canonicalUrl, featuredMediaId: featuredMediaId || null, editorId: editorId || null, categoryIds, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null };
    try {
      const response = await fetch(selectedId ? `/api/admin/articles/${encodeURIComponent(selectedId)}` : '/api/admin/articles', { method: selectedId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setSelectedId(data.id); setStatus(data.status); setSlug(data.slug); setSource(bodyHtml); if (editorRef.current) editorRef.current.innerHTML = bodyHtml;
      const savedArticle: Article = { id: data.id, slug: data.slug, title, excerpt, status: data.status };
      setArticles(current => {
        const exists = current.some(article => article.id === savedArticle.id);
        return exists ? current.map(article => article.id === savedArticle.id ? { ...article, ...savedArticle } : article) : [savedArticle, ...current].slice(0, 100);
      });
      setNotice(nextStatus === 'published' ? 'Article published.' : nextStatus === 'scheduled' ? 'Article scheduled successfully.' : 'Draft saved successfully.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setBusy(false); }
  };
  saveRef.current = save;
  const loadRevisions = async () => {
    if (!selectedId) return;
    setRevisionsOpen(true);
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(selectedId)}/revisions`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load revision history.');
      setRevisions(data.revisions || []);
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not load revision history.'); }
  };
  const restoreRevision = async (revisionId: string) => {
    if (!selectedId || !window.confirm('Restore this earlier version? Your current version will first be saved in revision history.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(selectedId)}/revisions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revisionId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not restore revision.');
      setTitle(data.article.title); setExcerpt(data.article.excerpt || ''); setSource(data.article.body_html || '');
      if (editorRef.current) editorRef.current.innerHTML = data.article.body_html || '';
      setNotice('Revision restored. Save changes when you are ready.');
      await loadRevisions();
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Could not restore revision.'); }
    finally { setBusy(false); }
  };
  const deleteArticle = async () => {
    if (!selectedId) return;
    const confirmed = window.confirm(`Permanently delete "${title || 'this article'}"? This removes it from the database and cannot be undone. Its featured image is also deleted from storage if no other article uses it.`);
    if (!confirmed) return;
    setBusy(true); setNotice('Deleting…');
    try {
      const response = await fetch(`/api/admin/articles/${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed.');
      setArticles(current => current.filter(article => article.id !== selectedId));
      reset();
      setNotice('Article permanently deleted.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Delete failed.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (mode === 'preview' || busy || !title.trim() || !slug.trim()) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      setNotice('Autosaving your changes…');
      void saveRef.current?.(status);
    }, 2500);
    return () => { if (autosaveRef.current) clearTimeout(autosaveRef.current); };
  }, [title, slug, excerpt, source, status, seoTitle, seoDescription, canonicalUrl, selectedId, mode, categoryIds, scheduledAt, featuredMediaId, editorId]);

  const upload = async () => {
    if (!uploadFile) { setNotice('Choose an image first.'); return; }
    setBusy(true); setNotice('Uploading image…');
    try {
      const form = new FormData(); form.set('file', uploadFile); form.set('alt', alt); form.set('caption', caption);
      const response = await fetch('/api/admin/media', { method: 'POST', body: form }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      await loadMedia(true); insertHtml(`<figure><img src="${String(data.url).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" alt="${String(data.alt || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" loading="lazy" />${data.caption ? `<figcaption>${String(data.caption).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</figcaption>` : ''}</figure><p></p>`);
      setUploadFile(null); setAlt(''); setCaption(''); if (fileRef.current) fileRef.current.value = ''; setNotice('Image uploaded and inserted into the article. Save the article to keep the change.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Upload failed.'); }
    finally { setBusy(false); }
  };
  const sendAsNewsletter = async () => {
    if (!selectedId) return;
    const confirmed = window.confirm(`Send "${title}" to every subscribed email now via Resend?`);
    if (!confirmed) return;
    setSendingNewsletter(true); setNewsletterNotice('Creating campaign…');
    try {
      const bodyHtml = `<h1>${title}</h1>${excerpt ? `<p>${excerpt}</p>` : ''}${readBody()}<p><a href="${window.location.origin}/blog/${slug}">Read on the site</a></p>`;
      const createResponse = await fetch('/api/admin/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: title, bodyHtml, articleId: selectedId }),
      });
      const createData = await createResponse.json();
      if (!createResponse.ok) throw new Error(createData.error || 'Could not create the campaign.');
      setNewsletterNotice('Sending to subscribers…');
      const sendResponse = await fetch(`/api/admin/newsletter/${encodeURIComponent(createData.id)}/send`, { method: 'POST' });
      const sendData = await sendResponse.json();
      if (!sendResponse.ok) throw new Error(sendData.error || 'Could not send the newsletter.');
      setNewsletterNotice(`Sent to ${sendData.sent} of ${sendData.total} subscribers${sendData.failed ? ` (${sendData.failed} failed)` : ''}.`);
    } catch (e) {
      setNewsletterNotice(e instanceof Error ? e.message : 'Could not send the newsletter.');
    } finally {
      setSendingNewsletter(false);
    }
  };
  const filtered = articles.filter(a => `${a.title} ${a.slug} ${a.status}`.toLowerCase().includes(search.toLowerCase()));
  const words = (mode === 'source' ? source : editorRef.current?.innerText || '').trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 220));

  return <section className="admin-editor-layout">
    <aside className="admin-article-sidebar"><div className="admin-sidebar-top"><h2>Articles</h2><button className="button small" onClick={reset} type="button">New article</button></div><input aria-label="Search articles" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles" />
      <div className="admin-article-list">{filtered.map(a => <button type="button" key={a.id} className={`admin-article-item ${selectedId === a.id ? 'active' : ''}`} onClick={() => openArticle(a.id)}><strong>{a.title}</strong><span>{a.status} · /{a.slug}</span></button>)}{filtered.length === 0 && <p className="admin-muted">No matching articles.</p>}</div>
    </aside>
    <div className="admin-editor-main"><div className="admin-editor-heading"><div><span className="eyebrow">CONTENT STUDIO</span><h2>{selectedId ? 'Edit article' : 'Create article'}</h2></div><div className="admin-editor-actions">{selectedId && status === 'published' && <button type="button" className="button secondary small" disabled={sendingNewsletter} onClick={sendAsNewsletter}>{sendingNewsletter ? 'Sending…' : 'Send as newsletter'}</button>}{selectedId && <button type="button" className="button secondary small admin-delete-button" disabled={busy} onClick={deleteArticle}>Delete</button>}<button type="button" className="button secondary small" disabled={busy} onClick={() => save('draft')}>Save draft</button><button type="button" className="button small" disabled={busy} onClick={() => save('published')}>Publish</button><button type="button" className="button secondary small" disabled={busy || !scheduledAt} onClick={() => save('scheduled')}>Schedule</button></div></div>
      {notice && <p className="admin-status-message" role="status">{notice}</p>}
      {newsletterNotice && <p className="admin-status-message" role="status">{newsletterNotice}</p>}
      <label className="admin-field">Article title<input value={title} maxLength={180} onChange={e => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="Write a clear, specific title" /></label>
      <label className="admin-field">URL slug<div className="admin-slug-field"><span>/blog/</span><input value={slug} maxLength={180} onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="article-url" /></div></label>
      <label className="admin-field">Excerpt<textarea value={excerpt} maxLength={500} rows={3} onChange={e => setExcerpt(e.target.value)} placeholder="A short summary for article cards and search results" /></label>
      <div className="admin-editor-toolbar" role="toolbar" aria-label="Article formatting"><button type="button" onClick={() => command('bold')}><b>B</b></button><button type="button" onClick={() => command('italic')}><i>I</i></button><button type="button" onClick={() => command('underline')}><u>U</u></button><button type="button" onClick={() => command('formatBlock','h2')}>H2</button><button type="button" onClick={() => command('formatBlock','h3')}>H3</button><button type="button" onClick={() => command('insertUnorderedList')}>• List</button><button type="button" onClick={() => command('insertOrderedList')}>1. List</button><button type="button" onClick={() => { const url = window.prompt('Enter a link URL'); if (url && /^https?:\/\//i.test(url)) command('createLink', url); }}>Link</button><button type="button" onClick={() => command('formatBlock','blockquote')}>Quote</button><button type="button" onClick={() => command('undo')}>Undo</button><button type="button" onClick={() => command('redo')}>Redo</button><button type="button" onClick={() => changeMode('visual')}>Visual</button><button type="button" onClick={() => changeMode('source')}>HTML</button><button type="button" onClick={() => changeMode('preview')}>Preview</button></div>
      {mode === 'visual' && <div ref={editorRef} className="admin-rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Article body editor" aria-multiline="true" onInput={e => setSource(e.currentTarget.innerHTML)} data-placeholder="Start writing your article here. Use the toolbar to format headings, lists, links and quotes." />}
      {mode === 'source' && <textarea className="admin-source-editor" aria-label="HTML source editor" value={source} onChange={e => setSource(e.target.value)} spellCheck={false} />}
      {mode === 'preview' && <article className="admin-article-preview"><h1>{title || 'Untitled article'}</h1>{excerpt && <p className="admin-preview-excerpt">{excerpt}</p>}<div dangerouslySetInnerHTML={{ __html: source }} /></article>}
      <div className="admin-editor-meta"><span>{words} words</span><span>About {readingMinutes} min read</span><span>Status: {status}</span></div>
      <div className="admin-editor-grid"><section className="admin-panel"><h3>Media library</h3><p className="admin-muted">Select an existing image to insert it at the current cursor position.</p>{!mediaLoaded && <button type="button" className="button secondary small" disabled={mediaLoading} onClick={() => loadMedia()}>{mediaLoading ? 'Loading media…' : 'Load media library'}</button>}<div className="admin-media-grid">{media.map(m => <button type="button" key={m.id} title={m.alt_text || 'Insert image'} onClick={() => insertHtml(`<figure><img src="${m.public_url.replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="${(m.alt_text || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" loading="lazy" />${m.caption ? `<figcaption>${m.caption.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</figcaption>` : ''}</figure><p></p>`)}><img src={m.public_url} alt={m.alt_text || ''} /><span>{m.alt_text || 'Untitled image'}</span></button>)}</div>
        <div className="admin-upload-form"><label className="admin-field">Upload image<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setUploadFile(e.target.files?.[0] || null)} /></label><label className="admin-field">Alternative text<input value={alt} onChange={e => setAlt(e.target.value)} maxLength={300} placeholder="Describe the image for accessibility" /></label><label className="admin-field">Caption<input value={caption} onChange={e => setCaption(e.target.value)} maxLength={500} placeholder="Optional image caption" /></label><button type="button" className="button secondary small" disabled={busy || !uploadFile} onClick={upload}>Upload and insert image</button></div>
      </section><section className="admin-panel"><h3>Featured image</h3><p className="admin-muted">Choose an image for article cards and social previews. This does not replace images in the article body.</p><select value={featuredMediaId} onFocus={() => { if (!mediaLoaded) void loadMedia(); }} onChange={e => setFeaturedMediaId(e.target.value)}><option value="">{mediaLoaded ? 'No featured image' : 'Load images to choose'}</option>{media.map(m => <option key={m.id} value={m.id}>{m.alt_text || m.public_url.split('/').pop()}</option>)}</select>{featuredMediaId && media.find(m => m.id === featuredMediaId) && <img className="admin-featured-preview" src={media.find(m => m.id === featuredMediaId)?.public_url} alt={media.find(m => m.id === featuredMediaId)?.alt_text || ''} />}</section>
      <section className="admin-panel"><h3>Editor</h3><p className="admin-muted">Choose which editor's byline appears on this article. Manage editors from the Editors tab.</p><select value={editorId} onChange={e => setEditorId(e.target.value)}><option value="">No editor assigned</option>{editors.map(ed => <option key={ed.id} value={ed.id}>{ed.display_name}{ed.status === 'hidden' ? ' (hidden)' : ''}</option>)}</select></section></div>
      <div className="admin-editor-grid admin-editor-extra-grid">
        <section className="admin-panel"><h3>Article categories</h3><p className="admin-muted">Select every category that fits this article.</p><div className="admin-category-options">{categories.map(category => <label key={category.id}><input type="checkbox" checked={categoryIds.includes(category.id)} onChange={e => setCategoryIds(current => e.target.checked ? [...current, category.id] : current.filter(id => id !== category.id))} /><span>{category.name}</span></label>)}</div>{categories.length === 0 && <p className="admin-muted">No categories loaded. Apply migration 0007 and refresh.</p>}</section>
        <section className="admin-panel"><h3>Publication schedule</h3><p className="admin-muted">Choose a future date and time, then save with Scheduled status. Times use your device's local timezone.</p><label className="admin-field">Publish date and time<input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></label><p className="admin-muted">The hosting scheduler must call the protected publishing endpoint regularly.</p></section>
      </div>
      {selectedId && <section className="admin-panel admin-revisions-panel"><div className="admin-revisions-heading"><div><h3>Revision history</h3><p className="admin-muted">Review earlier saved versions and restore one when needed.</p></div><button type="button" className="button secondary small" onClick={() => revisionsOpen ? setRevisionsOpen(false) : void loadRevisions()}>{revisionsOpen ? 'Hide history' : 'View history'}</button></div>{revisionsOpen && <div className="admin-revision-list">{revisions.map(revision => <div className="admin-revision-item" key={revision.id}><div><strong>{revision.title || 'Untitled version'}</strong><span>{new Date(revision.created_at).toLocaleString()}</span><p>{(revision.excerpt || revision.body_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).slice(0, 160)}</p></div><button type="button" className="button secondary small" disabled={busy} onClick={() => void restoreRevision(revision.id)}>Restore</button></div>)}{revisions.length === 0 && <p className="admin-muted">No revisions available yet.</p>}</div>}</section>}
      <details className="admin-panel admin-seo-panel"><summary>SEO and social metadata</summary><div className="admin-seo-fields"><label className="admin-field">SEO title<input value={seoTitle} maxLength={180} onChange={e => setSeoTitle(e.target.value)} placeholder={title || 'Search result title'} /></label><label className="admin-field">SEO description<textarea value={seoDescription} maxLength={320} rows={3} onChange={e => setSeoDescription(e.target.value)} placeholder="Describe the article in search results" /></label><label className="admin-field">Canonical URL<input type="url" value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} placeholder="https://example.com/blog/article" /></label></div></details>
      <div className="admin-bottom-actions"><label className="admin-field">Publication status<select value={status} onChange={e => setStatus(e.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label><button type="button" className="button" disabled={busy} onClick={() => save(status)}>Save changes</button></div>
    </div>
  </section>;
}
