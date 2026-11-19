'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';
import type { OrderDetail, OrderItemRecord } from '@/lib/services/store/types';

type ActionsResponse = { ok: boolean; error?: string; status?: 'approved' | 'pending' };
const ACTIONABLE_STATUSES = ['paid', 'shipped', 'finished'];

export function OrderActions({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [disputeType, setDisputeType] = useState<'refund' | 'exchange'>('refund');
  const [disputeReason, setDisputeReason] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [reviewMessages, setReviewMessages] = useState<Record<string, string>>({});

  const canCancel = order.status === 'pending_payment';
  const canDispute = ACTIONABLE_STATUSES.includes(order.status) && !order.dispute;
  const reviewableItems = order.items.filter(item => !item.reviewed && item.listingId && ACTIONABLE_STATUSES.includes(order.status));

  const disputeBase = order.finishedAt ?? order.shippedAt ?? order.paidAt ?? order.createdAt;
  const disputeOpen = order.disputeWindowHours > 0 && Date.now() - new Date(disputeBase).getTime() <= order.disputeWindowHours * 60 * 60 * 1000;

  async function postAction(payload: Record<string, unknown>): Promise<ActionsResponse | null> {
    setBusy(true);
    setActionError('');
    setActionMessage('');
    try {
      return await apiRequest<ActionsResponse>(`/api/store/orders/${encodeURIComponent(order.id)}/actions`, { method: 'POST', body: JSON.stringify(payload) });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The request could not be completed.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    const result = await postAction({ action: 'cancel' });
    if (result?.ok) { setActionMessage('This order has been cancelled.'); router.refresh(); }
    else if (result && !result.ok && result.error) setActionError(result.error);
  }

  async function submitDispute() {
    if (!disputeReason.trim()) { setActionError('Please describe the problem so we can help.'); return; }
    const result = await postAction({ action: 'dispute', disputeType, reason: disputeReason.trim() });
    if (result?.ok) { setActionMessage('Your dispute has been filed. Our team will contact you shortly.'); router.refresh(); }
    else if (result && !result.ok && result.error) setActionError(result.error);
  }

  async function submitReview(item: OrderItemRecord) {
    const rating = ratings[item.id] ?? 0;
    if (rating < 1) { setReviewErrors(prev => ({ ...prev, [item.id]: 'Please pick a star rating.' })); return; }
    if (!bodies[item.id]?.trim()) { setReviewErrors(prev => ({ ...prev, [item.id]: 'Please write a few words about the product.' })); return; }
    setReviewErrors(prev => ({ ...prev, [item.id]: '' }));
    setBusy(true);
    try {
      const result = await apiRequest<ActionsResponse>(`/api/store/orders/${encodeURIComponent(order.id)}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action: 'review', listingId: item.listingId, rating, title: titles[item.id]?.trim() ?? '', body: bodies[item.id].trim() }),
      });
      if (result.ok) {
        setReviewMessages(prev => ({ ...prev, [item.id]: result.status === 'approved' ? 'Review approved and published. Thank you.' : 'Review submitted for moderation. Thank you.' }));
        router.refresh();
      } else {
        setReviewErrors(prev => ({ ...prev, [item.id]: result.error || 'Your review could not be submitted.' }));
      }
    } catch (err) {
      setReviewErrors(prev => ({ ...prev, [item.id]: err instanceof Error ? err.message : 'Your review could not be submitted.' }));
    } finally {
      setBusy(false);
    }
  }

  if (!canCancel && !canDispute && reviewableItems.length === 0) return null;

  return (
    <section aria-label="Order actions">
      <h2>Actions</h2>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {actionMessage && <p className="form-success" role="status">{actionMessage}</p>}
      {canCancel && (
        <p><button type="button" className="button secondary" onClick={cancelOrder} disabled={busy}>Cancel order</button></p>
      )}
      {canDispute && (
        <div className="dispute-box">
          <h3>Report a problem</h3>
          {disputeOpen ? (
            <>
              <p>Not right? Tell us what happened. Disputes can be filed within {order.disputeWindowHours} {order.disputeWindowHours === 1 ? 'hour' : 'hours'} of the latest order update.</p>
              <div className="form-field">
                <label htmlFor="dispute-type">What do you need?</label>
                <select id="dispute-type" className="form-control" value={disputeType} onChange={event => setDisputeType(event.target.value === 'exchange' ? 'exchange' : 'refund')}>
                  <option value="refund">Refund</option>
                  <option value="exchange">Exchange</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="dispute-reason">Describe the problem</label>
                <textarea id="dispute-reason" className="form-control" rows={4} value={disputeReason} onChange={event => setDisputeReason(event.target.value)} placeholder="Tell us what went wrong with this order" />
              </div>
              <button type="button" className="button secondary" onClick={submitDispute} disabled={busy}>Submit dispute</button>
            </>
          ) : (
            <p>The dispute window for this order has closed. <a className="text-link" href="/contact">Contact support</a> if you still need help.</p>
          )}
        </div>
      )}
      {reviewableItems.length > 0 && (
        <div>
          <h3>Write a review</h3>
          {reviewableItems.map(item => (
            <div className="review-form" key={item.id}>
              <h4>{item.title}</h4>
              <div className="star-picker" role="group" aria-label={`Star rating for ${item.title}`}>
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    className={(ratings[item.id] ?? 0) >= value ? 'star-btn active' : 'star-btn'}
                    onClick={() => setRatings(prev => ({ ...prev, [item.id]: value }))}
                    aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                    aria-pressed={(ratings[item.id] ?? 0) === value}
                  >
                    <Star size={18} fill={(ratings[item.id] ?? 0) >= value ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <div className="form-field">
                <label htmlFor={`review-title-${item.id}`}>Title (optional)</label>
                <input id={`review-title-${item.id}`} className="form-control" value={titles[item.id] ?? ''} onChange={event => setTitles(prev => ({ ...prev, [item.id]: event.target.value }))} placeholder="Sum it up in a few words" />
              </div>
              <div className="form-field">
                <label htmlFor={`review-body-${item.id}`}>Your review</label>
                <textarea id={`review-body-${item.id}`} className="form-control" rows={3} value={bodies[item.id] ?? ''} onChange={event => setBodies(prev => ({ ...prev, [item.id]: event.target.value }))} placeholder="What did you like or dislike?" />
              </div>
              {reviewMessages[item.id] && <p className="form-success" role="status">{reviewMessages[item.id]}</p>}
              {reviewErrors[item.id] && <p className="form-error" role="alert">{reviewErrors[item.id]}</p>}
              <button type="button" className="button small" onClick={() => submitReview(item)} disabled={busy}>Submit review</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
