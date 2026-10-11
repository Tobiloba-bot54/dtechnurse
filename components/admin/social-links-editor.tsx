// File: DTECHNURSE-SITE-main/components/admin/social-links-editor.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { SocialIcon } from '@/components/social-icon';

type SocialLink = { platform: string; url: string; enabled: boolean };

const SUGGESTED_PLATFORMS = ['Twitter', 'LinkedIn', 'Facebook', 'Instagram', 'YouTube', 'TikTok'];

export default function SocialLinksEditor() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/social-links', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load social links.');
      setLinks(data.socialLinks || []);
      setLoaded(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load social links.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const updateLink = (index: number, patch: Partial<SocialLink>) => {
    setLinks(current => current.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };
  const addLink = () => setLinks(current => [...current, { platform: '', url: '', enabled: true }]);
  const removeLink = (index: number) => setLinks(current => current.filter((_, i) => i !== index));

  const save = async () => {
    setBusy(true); setNotice('Saving…');
    try {
      const response = await fetch('/api/admin/social-links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialLinks: links }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setNotice('Social links saved.');
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel admin-social-editor">
      <h3>Social links</h3>
      <p className="admin-muted">Add, remove or reorder the platforms shown in the site footer. The icon is chosen automatically from the platform name ({SUGGESTED_PLATFORMS.join(', ')}), with a generic link icon for anything else.</p>
      {notice && <p className="admin-status-message" role="status">{notice}</p>}
      <div className="admin-social-rows">
        {links.map((link, index) => (
          <div className="admin-social-row" key={index}>
            <span className="admin-social-icon-preview" aria-hidden="true"><SocialIcon platform={link.platform || 'link'} /></span>
            <input
              list="admin-social-platform-suggestions"
              value={link.platform}
              maxLength={60}
              placeholder="Platform (e.g. Twitter)"
              onChange={e => updateLink(index, { platform: e.target.value })}
            />
            <input
              type="url"
              value={link.url}
              maxLength={500}
              placeholder="https://…"
              onChange={e => updateLink(index, { url: e.target.value })}
            />
            <label className="admin-social-enabled">
              <input type="checkbox" checked={link.enabled} onChange={e => updateLink(index, { enabled: e.target.checked })} /> Shown
            </label>
            <button type="button" className="button secondary small" onClick={() => removeLink(index)} aria-label={`Remove ${link.platform || 'this link'}`}>Remove</button>
          </div>
        ))}
        {loaded && links.length === 0 && <p className="admin-muted">No social links yet. Add one below.</p>}
      </div>
      <datalist id="admin-social-platform-suggestions">
        {SUGGESTED_PLATFORMS.map(p => <option key={p} value={p} />)}
      </datalist>
      <div className="admin-pages-actions">
        <button type="button" className="button secondary small" onClick={addLink}>Add platform</button>
        <button type="button" className="button small" disabled={busy} onClick={save}>Save social links</button>
      </div>
    </section>
  );
}
