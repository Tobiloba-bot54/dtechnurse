'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

type SocialLink = { platform: string; url: string };
type Editor = {
  id: string; slug: string; display_name: string; credentials: string; bio: string;
  avatar_url: string | null; social_links: string; status: 'active' | 'hidden';
};

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160);

function parseLinks(raw: string): SocialLink[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function EditorsManager() {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [credentials, setCredentials] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'hidden'>('active');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/editors', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load editors.');
      setEditors(data.editors || []);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load editors.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setSelectedId(''); setDisplayName(''); setSlug(''); setSlugTouched(false); setCredentials(''); setBio(''); setAvatarUrl(''); setStatus('active'); setSocialLinks([]); setNotice('New editor ready.');
  };

  const openEditor = (editor: Editor) => {
    setSelectedId(editor.id); setDisplayName(editor.display_name); setSlug(editor.slug); setSlugTouched(true);
    setCredentials(editor.credentials || ''); setBio(editor.bio || ''); setAvatarUrl(editor.avatar_url || '');
    setStatus(editor.status); setSocialLinks(parseLinks(editor.social_links)); setNotice(`Editing ${editor.display_name}.`);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true); setNotice('Uploading photo…');
    try {
      const form = new FormData(); form.set('file', file); form.set('alt', `${displayName || 'Editor'} profile photo`);
      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      setAvatarUrl(data.url);
      setNotice('Photo uploaded. Save the editor to keep the change.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updateLink = (index: number, patch: Partial<SocialLink>) => setSocialLinks(cur => cur.map((l, i) => i === index ? { ...l, ...patch } : l));
  const addLink = () => setSocialLinks(cur => [...cur, { platform: '', url: '' }]);
  const removeLink = (index: number) => setSocialLinks(cur => cur.filter((_, i) => i !== index));

  const save = async () => {
    setBusy(true); setNotice('Saving…');
    const payload = { displayName, slug, credentials, bio, avatarUrl: avatarUrl || null, status, socialLinks };
    try {
      const response = await fetch(selectedId ? `/api/admin/editors/${encodeURIComponent(selectedId)}` : '/api/admin/editors', {
        method: selectedId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setSelectedId(data.id); setSlug(data.slug);
      await load();
      setNotice('Editor saved.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selectedId) return;
    const confirmed = window.confirm(`Delete editor "${displayName}"? Articles currently assigned to them will show no byline.`);
    if (!confirmed) return;
    setBusy(true); setNotice('Deleting…');
    try {
      const response = await fetch(`/api/admin/editors/${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Delete failed.');
      reset();
      await load();
      setNotice('Editor deleted.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-editor-layout">
      <aside className="admin-article-sidebar">
        <div className="admin-sidebar-top"><h2>Editors</h2><button className="button small" type="button" onClick={reset}>New editor</button></div>
        <div className="admin-article-list">
          {editors.map(ed => (
            <button type="button" key={ed.id} className={`admin-article-item ${selectedId === ed.id ? 'active' : ''}`} onClick={() => openEditor(ed)}>
              <strong>{ed.display_name}</strong>
              <span>{ed.status}{ed.credentials ? ` · ${ed.credentials}` : ''}</span>
            </button>
          ))}
          {editors.length === 0 && <p className="admin-muted">No editors yet.</p>}
        </div>
      </aside>

      <div className="admin-editor-main">
        <div className="admin-editor-heading">
          <div><span className="eyebrow">PUBLIC PROFILES</span><h2>{selectedId ? 'Edit editor' : 'Create editor'}</h2></div>
          <div className="admin-editor-actions">
            {selectedId && <button type="button" className="button secondary small admin-delete-button" disabled={busy} onClick={remove}>Delete</button>}
            <button type="button" className="button small" disabled={busy} onClick={save}>{selectedId ? 'Save changes' : 'Create editor'}</button>
          </div>
        </div>
        {notice && <p className="admin-status-message" role="status">{notice}</p>}

        <label className="admin-field">Name<input value={displayName} maxLength={160} onChange={e => { setDisplayName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} placeholder="Jane Doe" /></label>
        <label className="admin-field">Profile URL<div className="admin-slug-field"><span>/editors/</span><input value={slug} maxLength={160} onChange={e => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="jane-doe" /></div></label>
        <label className="admin-field">Credentials<input value={credentials} maxLength={160} onChange={e => setCredentials(e.target.value)} placeholder="RN, BSN" /></label>
        <label className="admin-field">Bio<textarea value={bio} maxLength={2000} rows={5} onChange={e => setBio(e.target.value)} placeholder="A short public bio" /></label>

        <section className="admin-panel">
          <h3>Profile photo</h3>
          {avatarUrl && <img className="admin-featured-preview" src={avatarUrl} alt="" />}
          <label className="admin-field">Upload photo<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); }} /></label>
          {uploadingAvatar && <p className="admin-muted">Uploading…</p>}
          {avatarUrl && <button type="button" className="button secondary small" onClick={() => setAvatarUrl('')}>Remove photo</button>}
        </section>

        <section className="admin-panel admin-social-editor">
          <h3>Social links</h3>
          <div className="admin-social-rows">
            {socialLinks.map((link, index) => (
              <div className="admin-social-row" key={index}>
                <input value={link.platform} maxLength={60} placeholder="Platform" onChange={e => updateLink(index, { platform: e.target.value })} />
                <input type="url" value={link.url} maxLength={500} placeholder="https://…" onChange={e => updateLink(index, { url: e.target.value })} />
                <button type="button" className="button secondary small" onClick={() => removeLink(index)}>Remove</button>
              </div>
            ))}
            {socialLinks.length === 0 && <p className="admin-muted">No social links yet.</p>}
          </div>
          <button type="button" className="button secondary small" onClick={addLink}>Add link</button>
        </section>

        <label className="admin-field">Visibility<select value={status} onChange={e => setStatus(e.target.value === 'hidden' ? 'hidden' : 'active')}><option value="active">Visible on the site</option><option value="hidden">Hidden</option></select></label>
      </div>
    </section>
  );
}
