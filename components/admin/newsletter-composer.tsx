'use client';
import { useCallback, useEffect, useState } from 'react';

type Campaign = {
  id: string; subject: string; article_id: string | null; status: string;
  recipient_count: number; sent_count: number; failed_count: number; sent_at: string | null; created_at: string;
};

export default function NewsletterComposer() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/newsletter', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load campaigns.');
      setCampaigns(data.campaigns || []);
      setSubscriberCount(data.subscriberCount || 0);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load campaigns.');
    }
  }, []);
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/resend', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load Resend settings.');
      setApiKeyMasked(data.apiKeyMasked || ''); setApiKeySet(Boolean(data.apiKeySet));
      setFromEmail(data.fromEmail || ''); setFromName(data.fromName || 'DTECHNURSE');
    } catch (e) {
      setSettingsNotice(e instanceof Error ? e.message : 'Could not load Resend settings.');
    }
  }, []);
  useEffect(() => { load(); loadSettings(); }, [load, loadSettings]);

  const reset = () => { setSelectedId(''); setSubject(''); setBodyHtml(''); setNotice('New campaign ready.'); };

  const openCampaign = async (id: string) => {
    setBusy(true); setNotice('Loading…');
    try {
      const response = await fetch(`/api/admin/newsletter/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load campaign.');
      setSelectedId(data.campaign.id); setSubject(data.campaign.subject); setBodyHtml(data.campaign.body_html || '');
      setNotice(data.campaign.status === 'draft' ? 'Draft loaded.' : `This campaign is ${data.campaign.status} and can no longer be edited.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load campaign.');
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!subject.trim() || !bodyHtml.trim()) { setNotice('Subject and content are required.'); return; }
    setBusy(true); setNotice('Saving draft…');
    try {
      const response = await fetch(selectedId ? `/api/admin/newsletter/${encodeURIComponent(selectedId)}` : '/api/admin/newsletter', {
        method: selectedId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, bodyHtml }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setSelectedId(data.id);
      await load();
      setNotice('Draft saved.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!selectedId) { await saveDraft(); }
    const idToSend = selectedId;
    if (!idToSend) return;
    const confirmed = window.confirm(`Send "${subject}" to ${subscriberCount} subscriber(s) now?`);
    if (!confirmed) return;
    setBusy(true); setNotice('Sending…');
    try {
      const response = await fetch(`/api/admin/newsletter/${encodeURIComponent(idToSend)}/send`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Send failed.');
      setNotice(`Sent to ${data.sent} of ${data.total} subscribers${data.failed ? ` (${data.failed} failed)` : ''}.`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Send failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setSettingsBusy(true); setSettingsNotice('Saving…');
    try {
      const response = await fetch('/api/admin/settings/resend', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(apiKey ? { apiKey } : {}), fromEmail, fromName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Save failed.');
      setApiKey('');
      await loadSettings();
      setSettingsNotice('Resend settings saved.');
    } catch (e) {
      setSettingsNotice(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSettingsBusy(false);
    }
  };

  const selected = campaigns.find(c => c.id === selectedId);
  const locked = selected ? selected.status !== 'draft' : false;

  return (
    <section className="admin-editor-layout">
      <aside className="admin-article-sidebar">
        <div className="admin-sidebar-top"><h2>Newsletter</h2><button className="button small" type="button" onClick={reset}>New campaign</button></div>
        <p className="admin-muted">{subscriberCount} subscribed email{subscriberCount === 1 ? '' : 's'}.</p>
        <div className="admin-article-list">
          {campaigns.map(c => (
            <button type="button" key={c.id} className={`admin-article-item ${selectedId === c.id ? 'active' : ''}`} onClick={() => openCampaign(c.id)}>
              <strong>{c.subject}</strong>
              <span>{c.status}{c.status !== 'draft' ? ` · ${c.sent_count}/${c.recipient_count} sent` : ''}</span>
            </button>
          ))}
          {campaigns.length === 0 && <p className="admin-muted">No campaigns yet.</p>}
        </div>
      </aside>

      <div className="admin-editor-main">
        <div className="admin-editor-heading">
          <div><span className="eyebrow">EMAIL CAMPAIGN</span><h2>{selectedId ? 'Edit campaign' : 'Compose newsletter'}</h2></div>
          <div className="admin-editor-actions">
            <button type="button" className="button secondary small" disabled={busy || locked} onClick={saveDraft}>Save draft</button>
            <button type="button" className="button small" disabled={busy || locked} onClick={send}>Send now</button>
          </div>
        </div>
        {notice && <p className="admin-status-message" role="status">{notice}</p>}

        <label className="admin-field">Subject<input value={subject} maxLength={200} disabled={locked} onChange={e => setSubject(e.target.value)} placeholder="This week from DTECHNURSE" /></label>
        <label className="admin-field">Email content (HTML)<textarea className="admin-source-editor" value={bodyHtml} disabled={locked} onChange={e => setBodyHtml(e.target.value)} spellCheck={false} placeholder="<p>Write your update…</p>" /></label>

        <section className="admin-panel">
          <h3>Resend settings</h3>
          <p className="admin-muted">The Resend API key is stored on the server and used to send every campaign and article newsletter.</p>
          <label className="admin-field">Resend API key{apiKeySet && <span className="admin-muted"> — currently {apiKeyMasked}</span>}<input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={apiKeySet ? 'Enter a new key to replace it' : 're_xxx'} /></label>
          <label className="admin-field">From name<input value={fromName} maxLength={120} onChange={e => setFromName(e.target.value)} placeholder="DTECHNURSE" /></label>
          <label className="admin-field">From email<input type="email" value={fromEmail} maxLength={254} onChange={e => setFromEmail(e.target.value)} placeholder="news@dtechnurse.com" /></label>
          {settingsNotice && <p className="admin-status-message" role="status">{settingsNotice}</p>}
          <button type="button" className="button secondary small" disabled={settingsBusy} onClick={saveSettings}>Save Resend settings</button>
        </section>
      </div>
    </section>
  );
}
