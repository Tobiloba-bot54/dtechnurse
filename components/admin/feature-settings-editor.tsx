'use client';
import { useEffect, useState } from 'react';

type Settings = { relatedArticles: boolean };
export default function FeatureSettingsEditor() {
  const [settings, setSettings] = useState<Settings>({ relatedArticles: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackSecretKey, setPaystackSecretKey] = useState('');
  const [paystackStatus, setPaystackStatus] = useState('');
  const [paystackSource, setPaystackSource] = useState('missing');
  const [savingPaystack, setSavingPaystack] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/features', { cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load settings.');
        if (active) setSettings({ relatedArticles: data.relatedArticles !== false });
      })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Could not load settings.'); })
      .finally(() => { if (active) setLoading(false); });
    fetch('/api/admin/settings/paystack', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load payment settings.'); if (active) { setPaystackPublicKey(data.publicKey || ''); setPaystackSource(data.source || 'missing'); setPaystackStatus(data.secretKeyConfigured ? `Secret key configured (${data.source}).` : 'Paystack secret key is not configured.'); } }).catch(error => { if (active) setPaystackStatus(error instanceof Error ? error.message : 'Could not load payment settings.'); });
    return () => { active = false; };
  }, []);

  async function save(next: Settings) {
    setSettings(next);
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/settings/features', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save settings.');
      setMessage('Settings saved.');
    } catch (error) {
      setSettings(current => ({ ...current, relatedArticles: !next.relatedArticles }));
      setMessage(error instanceof Error ? error.message : 'Could not save settings.');
    } finally { setSaving(false); }
  }

  return <section className="admin-social-editor" aria-labelledby="feature-settings-heading">
    <div className="admin-panel">
      <div className="admin-editor-heading"><div><span className="eyebrow">SITE CONTROLS</span><h2 id="feature-settings-heading">Feature settings</h2></div></div>
      <p className="admin-muted">Turn optional public-facing features on or off. Changes are saved to the site settings table.</p>
      {loading ? <p className="admin-muted">Loading settings…</p> : <label className="admin-feature-toggle">
        <span><strong>Related articles</strong><small>Show up to six related published articles at the end of each article.</small></span>
        <input type="checkbox" checked={settings.relatedArticles} disabled={saving} onChange={event => save({ relatedArticles: event.target.checked })} />
      </label>}
      {saving && <p className="admin-muted" role="status">Saving…</p>}
      {message && <p className="admin-status-message" role="status">{message}</p>}
    </div>
    <div className="admin-panel paystack-settings-panel">
      <div className="admin-editor-heading"><div><span className="eyebrow">PAYMENTS</span><h2>Paystack settings</h2></div></div>
      <p className="admin-muted">The secret key is used only on the server. You can also configure PAYSTACK_SECRET_KEY in the hosting environment. Never share the secret key publicly.</p>
      <label className="admin-field">Paystack public key<input value={paystackPublicKey} onChange={event => setPaystackPublicKey(event.target.value)} placeholder="pk_test_… or pk_live_…" autoComplete="off" /></label>
      <label className="admin-field">Paystack secret key<input type="password" value={paystackSecretKey} onChange={event => setPaystackSecretKey(event.target.value)} placeholder="Enter a new secret key to replace the current key" autoComplete="new-password" /></label>
      <p className="admin-muted">Current source: {paystackSource}. {paystackStatus}</p>
      <button type="button" className="button" disabled={savingPaystack} onClick={async () => { setSavingPaystack(true); setPaystackStatus('Saving payment settings…'); try { const response = await fetch('/api/admin/settings/paystack', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publicKey: paystackPublicKey, secretKey: paystackSecretKey }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not save payment settings.'); setPaystackSecretKey(''); setPaystackSource('admin'); setPaystackStatus('Paystack settings saved.'); } catch (error) { setPaystackStatus(error instanceof Error ? error.message : 'Could not save payment settings.'); } finally { setSavingPaystack(false); } }}>{savingPaystack ? 'Saving…' : 'Save Paystack settings'}</button>
    </div>
  </section>;
}
