// File: DTECHNURSE-SITE-main/components/admin/store/gift-cards-manager.tsx
'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/services/http';
import { formatNaira } from '@/lib/services/store/types';

type GiftCard = { id: string; code: string; initialAmountKobo: number; balanceKobo: number; status: string; expiresAt: string | null; createdAt: string };

function toKobo(naira: number): number { return Math.round(naira * 100); }

export function GiftCardsManager() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ items: GiftCard[] }>('/api/admin/store/gift-cards');
      setCards(data.items ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gift cards could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    const naira = Number(amount);
    if (!Number.isFinite(naira) || naira <= 0) { setError('Enter a gift card amount greater than zero.'); return; }
    setBusy(true); setError(''); setMessage(''); setCreatedCode('');
    try {
      const payload: Record<string, unknown> = { initialAmountKobo: toKobo(naira) };
      if (expiresAt) {
        const date = new Date(`${expiresAt}T23:59:59`);
        if (!Number.isNaN(date.getTime())) payload.expiresAt = date.toISOString();
      }
      const data = await apiRequest<{ id: string; code: string }>('/api/admin/store/gift-cards', { method: 'POST', body: JSON.stringify(payload) });
      setCreatedCode(data.code);
      setMessage('Gift card created. Share the code with the customer.');
      setAmount(''); setExpiresAt('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The gift card could not be created.');
    } finally { setBusy(false); }
  }

  async function setStatus(card: GiftCard, status: 'active' | 'disabled') {
    if (status === 'disabled' && !window.confirm(`Disable gift card ${card.code}? Customers will no longer be able to redeem it.`)) return;
    setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/store/gift-cards', { method: 'PATCH', body: JSON.stringify({ id: card.id, status }) });
      setMessage(`Gift card ${card.code} is now ${status}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The gift card could not be updated.');
    }
  }

  return (
    <section className="store-admin" aria-label="Gift cards">
      <div className="admin-panel">
        <div className="admin-panel-head">
          <div><span className="eyebrow">NEW GIFT CARD</span><h3>Create gift card</h3></div>
        </div>
        <form onSubmit={create}>
          <div className="form-row">
            <label className="form-field">Amount in naira<input className="form-control" type="number" min="1" step="any" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" /></label>
            <label className="form-field">Expiry date (optional)<input className="form-control" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} /></label>
          </div>
          <button className="button small" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create gift card'}</button>
        </form>
        {createdCode && (
          <p className="success-text" role="status">
            New gift card code: <strong>{createdCode}</strong>. Copy it now and share it with the customer.
          </p>
        )}
      </div>
      {message && <p className="success-text" role="status">{message}</p>}
      {error && <p className="danger-text" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading gift cards…</p> : cards.length === 0 ? (
        <div className="empty-state">No gift cards yet. Create one above to issue store credit.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Code</th><th>Initial</th><th>Balance</th><th>Status</th><th>Expires</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {cards.map(card => (
                <tr key={card.id}>
                  <td><strong>{card.code}</strong></td>
                  <td className="money">{formatNaira(card.initialAmountKobo)}</td>
                  <td className="money">{formatNaira(card.balanceKobo)}</td>
                  <td><span className={`status-pill ${card.status}`}>{card.status}</span></td>
                  <td>{card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : 'No expiry'}</td>
                  <td>{new Date(card.createdAt).toLocaleDateString()}</td>
                  <td>
                    {card.status === 'active' ? <button type="button" className="button secondary small" onClick={() => void setStatus(card, 'disabled')}>Disable</button>
                      : card.status === 'disabled' ? <button type="button" className="button secondary small" onClick={() => void setStatus(card, 'active')}>Enable</button>
                      : <span className="muted-text">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
