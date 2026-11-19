// File: DTECHNURSE-SITE-main/components/admin/store/settings-manager.tsx
'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/services/http';
import type { StoreSettings } from '@/lib/services/store/types';

type GatewayInfo = { enabled: boolean; publicKey: string; secretKeyMasked: string; mode: 'test' | 'live'; source: string };
type EmailInfo = { enabled: boolean; apiKeyMasked?: string; fromEmail: string; fromName: string; mode: 'test' | 'live'; source: string };
type SettingsResponse = { settings: StoreSettings; paystack: GatewayInfo; flutterwave: GatewayInfo; email: EmailInfo };

type SettingsDraft = {
  name: string;
  homepageSectionEnabled: boolean;
  initialLoadCount: string;
  regionShippingEnabled: boolean;
  freeShippingRequiresAllItems: boolean;
  orderNumberPrefix: string;
  orderAutoFinishDays: string;
  disputeWindowHours: string;
  stockReservationEnabled: boolean;
  stockHoldMinutes: string;
  lowStockDefaultThreshold: string;
  moderatorCanDelete: boolean;
  reviewsAutoApprove: boolean;
  loyaltyPointsPerOrder: string;
  referralRewardAmount: string;
  referralRewardType: string;
  whatsappChatEnabled: boolean;
  whatsappNumber: string;
  whatsappOrderNotificationsEnabled: boolean;
  whatsappApiToken: string;
  whatsappPhoneNumberId: string;
};
type GatewayDraft = { enabled: boolean; publicKey: string; secretKey: string; mode: 'test' | 'live'; source: string; masked: string };
type EmailDraft = { enabled: boolean; apiKey: string; masked: string; fromEmail: string; fromName: string; mode: 'test' | 'live'; source: string };

const defaultDraft: SettingsDraft = {
  name: 'DTECHNURSE STORE',
  homepageSectionEnabled: true,
  initialLoadCount: '20',
  regionShippingEnabled: true,
  freeShippingRequiresAllItems: true,
  orderNumberPrefix: 'DTN',
  orderAutoFinishDays: '7',
  disputeWindowHours: '24',
  stockReservationEnabled: true,
  stockHoldMinutes: '15',
  lowStockDefaultThreshold: '5',
  moderatorCanDelete: false,
  reviewsAutoApprove: false,
  loyaltyPointsPerOrder: '0',
  referralRewardAmount: '0',
  referralRewardType: 'cash',
  whatsappChatEnabled: true,
  whatsappNumber: '',
  whatsappOrderNotificationsEnabled: false,
  whatsappApiToken: '',
  whatsappPhoneNumberId: '',
};

function toKobo(naira: number): number { return Math.round(naira * 100); }
function toInt(value: string): number { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : NaN; }
function draftFromSettings(settings: StoreSettings): SettingsDraft {
  return {
    name: settings.name ?? '',
    homepageSectionEnabled: settings.homepageSectionEnabled !== false,
    initialLoadCount: String(settings.initialLoadCount ?? 20),
    regionShippingEnabled: settings.regionShippingEnabled !== false,
    freeShippingRequiresAllItems: settings.freeShippingRequiresAllItems !== false,
    orderNumberPrefix: settings.orderNumberPrefix ?? 'DTN',
    orderAutoFinishDays: String(settings.orderAutoFinishDays ?? 7),
    disputeWindowHours: String(settings.disputeWindowHours ?? 24),
    stockReservationEnabled: settings.stockReservationEnabled !== false,
    stockHoldMinutes: String(settings.stockHoldMinutes ?? 15),
    lowStockDefaultThreshold: String(settings.lowStockDefaultThreshold ?? 5),
    moderatorCanDelete: settings.moderatorCanDelete === true,
    reviewsAutoApprove: settings.reviewsAutoApprove === true,
    loyaltyPointsPerOrder: String(settings.loyaltyPointsPerOrder ?? 0),
    referralRewardAmount: String((settings.referralRewardAmountKobo ?? 0) / 100),
    referralRewardType: settings.referralRewardType || 'cash',
    whatsappChatEnabled: settings.whatsappChatEnabled !== false,
    whatsappNumber: settings.whatsappNumber ?? '',
    whatsappOrderNotificationsEnabled: settings.whatsappOrderNotificationsEnabled === true,
    whatsappApiToken: settings.whatsappApiToken ?? '',
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? '',
  };
}

export function SettingsManager() {
  const [draft, setDraft] = useState<SettingsDraft>(defaultDraft);
  const [paystack, setPaystack] = useState<GatewayDraft>({ enabled: false, publicKey: '', secretKey: '', mode: 'test', source: 'missing', masked: '' });
  const [flutterwave, setFlutterwave] = useState<GatewayDraft>({ enabled: false, publicKey: '', secretKey: '', mode: 'test', source: 'missing', masked: '' });
  const [email, setEmail] = useState<EmailDraft>({ enabled: false, apiKey: '', masked: '', fromEmail: '', fromName: 'DTECHNURSE STORE', mode: 'test', source: 'missing' });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    apiRequest<SettingsResponse>('/api/admin/store/settings')
      .then(data => {
        if (!active) return;
        if (data.settings) setDraft(draftFromSettings(data.settings));
        if (data.paystack) setPaystack({ enabled: data.paystack.enabled, publicKey: data.paystack.publicKey ?? '', secretKey: '', mode: data.paystack.mode === 'live' ? 'live' : 'test', source: data.paystack.source ?? 'missing', masked: data.paystack.secretKeyMasked ?? '' });
        if (data.flutterwave) setFlutterwave({ enabled: data.flutterwave.enabled, publicKey: data.flutterwave.publicKey ?? '', secretKey: '', mode: data.flutterwave.mode === 'live' ? 'live' : 'test', source: data.flutterwave.source ?? 'missing', masked: data.flutterwave.secretKeyMasked ?? '' });
        if (data.email) setEmail({ enabled: data.email.enabled, apiKey: '', masked: data.email.apiKeyMasked ?? '', fromEmail: data.email.fromEmail ?? '', fromName: data.email.fromName ?? 'DTECHNURSE STORE', mode: data.email.mode === 'live' ? 'live' : 'test', source: data.email.source ?? 'missing' });
      })
      .catch(e => { if (active) setLoadError(e instanceof Error ? e.message : 'Store settings could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) { setDraft(current => ({ ...current, [key]: value })); }

  function setSectionState(section: string, ok: string, fail: string) {
    setSuccess(current => ({ ...current, [section]: ok }));
    setErrors(current => ({ ...current, [section]: fail }));
  }

  async function saveSection(section: string, payload: Record<string, unknown>) {
    setBusy(current => ({ ...current, [section]: true }));
    setSectionState(section, '', '');
    try {
      await apiRequest('/api/admin/store/settings', { method: 'PUT', body: JSON.stringify({ settings: payload }) });
      setSectionState(section, 'Settings saved.', '');
    } catch (e) {
      setSectionState(section, '', e instanceof Error ? e.message : 'Settings could not be saved.');
    } finally {
      setBusy(current => ({ ...current, [section]: false }));
    }
  }

  function saveGeneral() {
    if (Number.isNaN(toInt(draft.initialLoadCount))) { setSectionState('general', '', 'Enter a valid initial load count.'); return; }
    void saveSection('general', { name: draft.name, homepageSectionEnabled: draft.homepageSectionEnabled, initialLoadCount: toInt(draft.initialLoadCount) });
  }
  function saveShippingSection() { void saveSection('shipping', { regionShippingEnabled: draft.regionShippingEnabled, freeShippingRequiresAllItems: draft.freeShippingRequiresAllItems }); }
  function saveOrders() {
    if (Number.isNaN(toInt(draft.orderAutoFinishDays)) || Number.isNaN(toInt(draft.disputeWindowHours))) { setSectionState('orders', '', 'Enter valid numbers for the order windows.'); return; }
    void saveSection('orders', { orderNumberPrefix: draft.orderNumberPrefix, orderAutoFinishDays: toInt(draft.orderAutoFinishDays), disputeWindowHours: Math.max(1, toInt(draft.disputeWindowHours)) });
  }
  function saveStock() {
    if (Number.isNaN(toInt(draft.stockHoldMinutes)) || Number.isNaN(toInt(draft.lowStockDefaultThreshold))) { setSectionState('stock', '', 'Enter valid numbers for the stock settings.'); return; }
    void saveSection('stock', { stockReservationEnabled: draft.stockReservationEnabled, stockHoldMinutes: toInt(draft.stockHoldMinutes), lowStockDefaultThreshold: toInt(draft.lowStockDefaultThreshold), moderatorCanDelete: draft.moderatorCanDelete });
  }
  function saveLoyalty() {
    const reward = Number(draft.referralRewardAmount);
    if (Number.isNaN(toInt(draft.loyaltyPointsPerOrder)) || !Number.isFinite(reward) || reward < 0) { setSectionState('loyalty', '', 'Enter valid reward values.'); return; }
    void saveSection('loyalty', { reviewsAutoApprove: draft.reviewsAutoApprove, loyaltyPointsPerOrder: toInt(draft.loyaltyPointsPerOrder), referralRewardAmountKobo: toKobo(reward), referralRewardType: draft.referralRewardType });
  }
  function saveWhatsapp() {
    void saveSection('whatsapp', {
      whatsappChatEnabled: draft.whatsappChatEnabled,
      whatsappNumber: draft.whatsappNumber,
      whatsappOrderNotificationsEnabled: draft.whatsappOrderNotificationsEnabled,
      whatsappApiToken: draft.whatsappApiToken,
      whatsappPhoneNumberId: draft.whatsappPhoneNumberId,
    });
  }

  async function saveGateway(provider: 'paystack' | 'flutterwave') {
    const gateway = provider === 'paystack' ? paystack : flutterwave;
    setBusy(current => ({ ...current, [provider]: true }));
    setSectionState(provider, '', '');
    try {
      const payload: Record<string, unknown> = { enabled: gateway.enabled, publicKey: gateway.publicKey, mode: gateway.mode };
      if (gateway.secretKey.trim()) payload.secretKey = gateway.secretKey.trim();
      await apiRequest('/api/admin/store/settings', { method: 'PUT', body: JSON.stringify({ [provider]: payload }) });
      if (provider === 'paystack') setPaystack(current => ({ ...current, secretKey: '' }));
      else setFlutterwave(current => ({ ...current, secretKey: '' }));
      setSectionState(provider, 'Payment gateway settings saved.', '');
    } catch (e) {
      setSectionState(provider, '', e instanceof Error ? e.message : 'Payment gateway settings could not be saved.');
    } finally {
      setBusy(current => ({ ...current, [provider]: false }));
    }
  }

  async function saveEmailSettings() {
    setBusy(current => ({ ...current, email: true }));
    setSectionState('email', '', '');
    try {
      const payload: Record<string, unknown> = { enabled: email.enabled, fromEmail: email.fromEmail, fromName: email.fromName, mode: email.mode };
      if (email.apiKey.trim()) payload.apiKey = email.apiKey.trim();
      await apiRequest('/api/admin/store/settings', { method: 'PUT', body: JSON.stringify({ email: payload }) });
      setEmail(current => ({ ...current, apiKey: '' }));
      setSectionState('email', 'Email settings saved.', '');
    } catch (e) {
      setSectionState('email', '', e instanceof Error ? e.message : 'Email settings could not be saved.');
    } finally {
      setBusy(current => ({ ...current, email: false }));
    }
  }

  function gatewayPanel(provider: 'paystack' | 'flutterwave') {
    const gateway = provider === 'paystack' ? paystack : flutterwave;
    const setGateway = (patch: Partial<GatewayDraft>) => provider === 'paystack' ? setPaystack(current => ({ ...current, ...patch })) : setFlutterwave(current => ({ ...current, ...patch }));
    return (
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">{provider === 'paystack' ? 'PAYSTACK' : 'FLUTTERWAVE'}</span><h3>{provider === 'paystack' ? 'Paystack' : 'Flutterwave'} gateway</h3></div>
          <button type="button" className="button small" disabled={busy[provider]} onClick={() => void saveGateway(provider)}>{busy[provider] ? 'Saving…' : 'Save gateway'}</button>
        </div>
        {success[provider] && <p className="success-text" role="status">{success[provider]}</p>}
        {errors[provider] && <p className="danger-text" role="alert">{errors[provider]}</p>}
        <label className="admin-feature-toggle">
          <span><strong>Enabled</strong><small>Disabled gateways are rejected at checkout.</small></span>
          <input type="checkbox" checked={gateway.enabled} onChange={e => setGateway({ enabled: e.target.checked })} />
        </label>
        <label className="form-field">Public key<input className="form-control" value={gateway.publicKey} onChange={e => setGateway({ publicKey: e.target.value })} placeholder="pk_test_… or pk_live_…" autoComplete="off" /></label>
        <label className="form-field">Secret key<input className="form-control" type="password" value={gateway.secretKey} onChange={e => setGateway({ secretKey: e.target.value })} placeholder="Enter a new secret key to replace the current one" autoComplete="new-password" /></label>
        {gateway.masked && <p className="muted-text">Current secret key: {gateway.masked}</p>}
        <label className="form-field">Mode
          <select className="form-control" value={gateway.mode} onChange={e => setGateway({ mode: e.target.value === 'live' ? 'live' : 'test' })}>
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </label>
        <p className="muted-text">Key source: {gateway.source}. The secret key is stored server side only.</p>
      </div>
    );
  }

  if (loading) return <section className="store-admin" aria-label="Store settings"><p className="admin-muted">Loading store settings…</p></section>;
  if (loadError) return <section className="store-admin" aria-label="Store settings"><p className="danger-text" role="alert">{loadError}</p></section>;

  return (
    <section className="store-admin" aria-label="Store settings">
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">GENERAL</span><h3>General</h3></div>
          <button type="button" className="button small" disabled={busy.general} onClick={saveGeneral}>{busy.general ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.general && <p className="success-text" role="status">{success.general}</p>}
        {errors.general && <p className="danger-text" role="alert">{errors.general}</p>}
        <label className="form-field">Store name<input className="form-control" value={draft.name} onChange={e => update('name', e.target.value)} /></label>
        <label className="form-field">Default currency<input className="form-control" value="NGN" readOnly aria-readonly="true" /></label>
        <label className="admin-feature-toggle">
          <span><strong>Homepage store section</strong><small>Show store products on the site homepage.</small></span>
          <input type="checkbox" checked={draft.homepageSectionEnabled} onChange={e => update('homepageSectionEnabled', e.target.checked)} />
        </label>
        <label className="form-field">Initial load count<input className="form-control" type="number" min="1" step="1" value={draft.initialLoadCount} onChange={e => update('initialLoadCount', e.target.value)} /></label>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">SHIPPING</span><h3>Shipping</h3></div>
          <button type="button" className="button small" disabled={busy.shipping} onClick={saveShippingSection}>{busy.shipping ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.shipping && <p className="success-text" role="status">{success.shipping}</p>}
        {errors.shipping && <p className="danger-text" role="alert">{errors.shipping}</p>}
        <label className="admin-feature-toggle">
          <span><strong>Region shipping</strong><small>Charge zone based fees by state at checkout.</small></span>
          <input type="checkbox" checked={draft.regionShippingEnabled} onChange={e => update('regionShippingEnabled', e.target.checked)} />
        </label>
        <label className="admin-feature-toggle">
          <span><strong>Free shipping requires all items</strong><small>When off, a single free shipping item makes the whole order free.</small></span>
          <input type="checkbox" checked={draft.freeShippingRequiresAllItems} onChange={e => update('freeShippingRequiresAllItems', e.target.checked)} />
        </label>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">ORDERS</span><h3>Orders</h3></div>
          <button type="button" className="button small" disabled={busy.orders} onClick={saveOrders}>{busy.orders ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.orders && <p className="success-text" role="status">{success.orders}</p>}
        {errors.orders && <p className="danger-text" role="alert">{errors.orders}</p>}
        <div className="form-row">
          <label className="form-field">Order number prefix<input className="form-control" value={draft.orderNumberPrefix} onChange={e => update('orderNumberPrefix', e.target.value)} /></label>
          <label className="form-field">Auto finish days after shipping<input className="form-control" type="number" min="0" step="1" value={draft.orderAutoFinishDays} onChange={e => update('orderAutoFinishDays', e.target.value)} /></label>
          <label className="form-field">Dispute window hours<input className="form-control" type="number" min="1" step="1" value={draft.disputeWindowHours} onChange={e => update('disputeWindowHours', e.target.value)} /></label>
        </div>
        <label className="form-field">Refund method<input className="form-control" value="manual" readOnly aria-readonly="true" /></label>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">STOCK</span><h3>Stock</h3></div>
          <button type="button" className="button small" disabled={busy.stock} onClick={saveStock}>{busy.stock ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.stock && <p className="success-text" role="status">{success.stock}</p>}
        {errors.stock && <p className="danger-text" role="alert">{errors.stock}</p>}
        <label className="admin-feature-toggle">
          <span><strong>Stock reservation</strong><small>Stock is held while an order waits for payment.</small></span>
          <input type="checkbox" checked={draft.stockReservationEnabled} onChange={e => update('stockReservationEnabled', e.target.checked)} />
        </label>
        <div className="form-row">
          <label className="form-field">Stock hold minutes<input className="form-control" type="number" min="0" step="1" value={draft.stockHoldMinutes} onChange={e => update('stockHoldMinutes', e.target.value)} /></label>
          <label className="form-field">Low stock default threshold<input className="form-control" type="number" min="0" step="1" value={draft.lowStockDefaultThreshold} onChange={e => update('lowStockDefaultThreshold', e.target.value)} /></label>
        </div>
        <label className="admin-feature-toggle">
          <span><strong>Moderators can delete listings</strong><small>When off, only full administrators can delete a listing.</small></span>
          <input type="checkbox" checked={draft.moderatorCanDelete} onChange={e => update('moderatorCanDelete', e.target.checked)} />
        </label>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">REVIEWS AND LOYALTY</span><h3>Reviews and loyalty</h3></div>
          <button type="button" className="button small" disabled={busy.loyalty} onClick={saveLoyalty}>{busy.loyalty ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.loyalty && <p className="success-text" role="status">{success.loyalty}</p>}
        {errors.loyalty && <p className="danger-text" role="alert">{errors.loyalty}</p>}
        <label className="admin-feature-toggle">
          <span><strong>Auto approve reviews</strong><small>When off, reviews wait in the moderation queue.</small></span>
          <input type="checkbox" checked={draft.reviewsAutoApprove} onChange={e => update('reviewsAutoApprove', e.target.checked)} />
        </label>
        <div className="form-row">
          <label className="form-field">Loyalty points per order<input className="form-control" type="number" min="0" step="1" value={draft.loyaltyPointsPerOrder} onChange={e => update('loyaltyPointsPerOrder', e.target.value)} /></label>
          <label className="form-field">Referral reward amount in naira<input className="form-control" type="number" min="0" step="any" value={draft.referralRewardAmount} onChange={e => update('referralRewardAmount', e.target.value)} /></label>
          <label className="form-field">Referral reward type
            <select className="form-control" value={draft.referralRewardType} onChange={e => update('referralRewardType', e.target.value)}>
              <option value="cash">Cash</option>
            </select>
          </label>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">WHATSAPP</span><h3>WhatsApp</h3></div>
          <button type="button" className="button small" disabled={busy.whatsapp} onClick={saveWhatsapp}>{busy.whatsapp ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.whatsapp && <p className="success-text" role="status">{success.whatsapp}</p>}
        {errors.whatsapp && <p className="danger-text" role="alert">{errors.whatsapp}</p>}
        <label className="admin-feature-toggle">
          <span><strong>WhatsApp chat</strong><small>Show a WhatsApp chat entry point on the storefront.</small></span>
          <input type="checkbox" checked={draft.whatsappChatEnabled} onChange={e => update('whatsappChatEnabled', e.target.checked)} />
        </label>
        <label className="form-field">WhatsApp chat number<input className="form-control" value={draft.whatsappNumber} onChange={e => update('whatsappNumber', e.target.value)} placeholder="2348012345678" /></label>
        <label className="admin-feature-toggle">
          <span><strong>Order notifications</strong><small>API slot, off for now. Saved for when the WhatsApp business API is connected.</small></span>
          <input type="checkbox" checked={draft.whatsappOrderNotificationsEnabled} onChange={e => update('whatsappOrderNotificationsEnabled', e.target.checked)} />
        </label>
        <label className="form-field">API token<input className="form-control" type="password" value={draft.whatsappApiToken} onChange={e => update('whatsappApiToken', e.target.value)} autoComplete="new-password" /></label>
        <label className="form-field">Phone number ID<input className="form-control" value={draft.whatsappPhoneNumberId} onChange={e => update('whatsappPhoneNumberId', e.target.value)} /></label>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">PAYMENT GATEWAYS</span><h3>Payment gateways</h3></div>
        </div>
        <div className="admin-form-grid">
          {gatewayPanel('paystack')}
          {gatewayPanel('flutterwave')}
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">EMAIL (RESEND)</span><h3>Email (Resend)</h3></div>
          <button type="button" className="button small" disabled={busy.email} onClick={() => void saveEmailSettings()}>{busy.email ? 'Saving…' : 'Save section'}</button>
        </div>
        {success.email && <p className="success-text" role="status">{success.email}</p>}
        {errors.email && <p className="danger-text" role="alert">{errors.email}</p>}
        <label className="admin-feature-toggle">
          <span><strong>Enabled</strong><small>Transactional order emails are sent through Resend.</small></span>
          <input type="checkbox" checked={email.enabled} onChange={e => setEmail(current => ({ ...current, enabled: e.target.checked }))} />
        </label>
        <label className="form-field">Resend API key<input className="form-control" type="password" value={email.apiKey} onChange={e => setEmail(current => ({ ...current, apiKey: e.target.value }))} placeholder="Enter a new API key to replace the current one" autoComplete="new-password" /></label>
        {email.masked && <p className="muted-text">Current API key: {email.masked}</p>}
        <div className="form-row">
          <label className="form-field">From email<input className="form-control" type="email" value={email.fromEmail} onChange={e => setEmail(current => ({ ...current, fromEmail: e.target.value }))} placeholder="store@dtechnurse.com" /></label>
          <label className="form-field">From name<input className="form-control" value={email.fromName} onChange={e => setEmail(current => ({ ...current, fromName: e.target.value }))} /></label>
        </div>
        <label className="form-field">Mode
          <select className="form-control" value={email.mode} onChange={e => setEmail(current => ({ ...current, mode: e.target.value === 'live' ? 'live' : 'test' }))}>
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </label>
        <p className="muted-text">Key source: {email.source}. Emails are skipped unless the service is enabled and in live mode.</p>
      </div>
    </section>
  );
}
