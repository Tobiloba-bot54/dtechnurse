// File: DTECHNURSE-SITE-main/components/admin/store/moderation-manager.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { apiRequest } from '@/lib/services/http';

type ReviewRecord = {
  id: string; listingId: string; listingTitle: string; userId: string; authorName: string; userEmail: string;
  orderId: string | null; rating: number; title: string; body: string; status: string; createdAt: string; moderatedAt: string | null;
};
type DisputeRecord = {
  id: string; orderId: string; orderNumber: string; userId: string; userEmail: string; disputeType: string;
  reason: string; status: string; resolutionNote: string; createdAt: string; resolvedAt: string | null;
};
type ModerationTab = 'reviews' | 'disputes';

const REVIEW_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];
const DISPUTE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="form-row">
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} size={16} aria-hidden="true" fill={star <= rating ? 'currentColor' : 'none'} className={star <= rating ? 'success-text' : 'muted-text'} />
      ))}
    </span>
  );
}

export function ModerationManager() {
  const [tab, setTab] = useState<ModerationTab>('reviews');
  const [reviewStatus, setReviewStatus] = useState('pending');
  const [disputeStatus, setDisputeStatus] = useState('open');
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadReviews = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ items: ReviewRecord[] }>(`/api/admin/store/moderation?type=reviews&status=${encodeURIComponent(status)}`);
      setReviews(data.items ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reviews could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  const loadDisputes = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ items: DisputeRecord[] }>(`/api/admin/store/moderation?type=disputes&status=${encodeURIComponent(status)}`);
      setDisputes(data.items ?? []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disputes could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'reviews') void loadReviews(reviewStatus);
    else void loadDisputes(disputeStatus);
  }, [tab, reviewStatus, disputeStatus, loadReviews, loadDisputes]);

  async function moderateReview(id: string, status: 'approved' | 'rejected') {
    setBusyId(id); setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/store/moderation', { method: 'PATCH', body: JSON.stringify({ type: 'reviews', id, status }) });
      setMessage(status === 'approved' ? 'Review approved and published.' : 'Review rejected.');
      await loadReviews(reviewStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review could not be moderated.');
    } finally { setBusyId(''); }
  }

  async function resolveDispute(id: string, status: 'resolved' | 'rejected') {
    const resolutionNote = notes[id]?.trim() ?? '';
    if (!resolutionNote) { setError('Write a resolution note before closing the dispute.'); return; }
    setBusyId(id); setError(''); setMessage('');
    try {
      await apiRequest('/api/admin/store/moderation', { method: 'PATCH', body: JSON.stringify({ type: 'disputes', id, status, resolutionNote }) });
      setMessage(status === 'resolved' ? 'Dispute resolved.' : 'Dispute rejected.');
      await loadDisputes(disputeStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The dispute could not be updated.');
    } finally { setBusyId(''); }
  }

  return (
    <section className="store-admin" aria-label="Store moderation">
      <div className="admin-toolbar">
        <div className="form-row" role="tablist" aria-label="Moderation queues">
          <button type="button" role="tab" aria-selected={tab === 'reviews'} className={`tab-pill ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Reviews</button>
          <button type="button" role="tab" aria-selected={tab === 'disputes'} className={`tab-pill ${tab === 'disputes' ? 'active' : ''}`} onClick={() => setTab('disputes')}>Disputes</button>
        </div>
        {tab === 'reviews' ? (
          <div className="form-row" role="group" aria-label="Filter reviews by status">
            {REVIEW_FILTERS.map(filter => (
              <button key={filter.value} type="button" className={`chip ${reviewStatus === filter.value ? 'active' : ''}`} onClick={() => setReviewStatus(filter.value)}>{filter.label}</button>
            ))}
          </div>
        ) : (
          <div className="form-row" role="group" aria-label="Filter disputes by status">
            {DISPUTE_FILTERS.map(filter => (
              <button key={filter.value} type="button" className={`chip ${disputeStatus === filter.value ? 'active' : ''}`} onClick={() => setDisputeStatus(filter.value)}>{filter.label}</button>
            ))}
          </div>
        )}
      </div>
      {message && <p className="success-text" role="status">{message}</p>}
      {error && <p className="danger-text" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading moderation queue…</p> : tab === 'reviews' ? (
        reviews.length === 0 ? <div className="empty-state">No reviews with this status.</div> : (
          <div className="admin-form-grid">
            {reviews.map(review => (
              <article key={review.id} className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <h3>{review.title || 'Untitled review'}</h3>
                    <p className="muted-text">{review.listingTitle || 'Unavailable product'}</p>
                  </div>
                  <span className={`status-pill ${review.status}`}>{review.status}</span>
                </div>
                <Stars rating={review.rating} />
                <p>{review.body}</p>
                <p className="muted-text">{review.authorName} ({review.userEmail || 'no email'}) · {new Date(review.createdAt).toLocaleString()}</p>
                <div className="form-row">
                  <button type="button" className="button small" disabled={busyId === review.id} onClick={() => void moderateReview(review.id, 'approved')}>Approve</button>
                  <button type="button" className="button secondary small" disabled={busyId === review.id} onClick={() => void moderateReview(review.id, 'rejected')}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        disputes.length === 0 ? <div className="empty-state">No disputes with this status.</div> : (
          <div className="admin-form-grid">
            {disputes.map(dispute => (
              <article key={dispute.id} className="admin-panel">
                <div className="admin-panel-head">
                  <div>
                    <h3>Order {dispute.orderNumber}</h3>
                    <p className="muted-text">{dispute.userEmail || 'Unknown buyer'} · {new Date(dispute.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill ${dispute.status}`}>{dispute.status.replace('_', ' ')}</span>
                </div>
                <p><strong>Type:</strong> {dispute.disputeType}</p>
                <p>{dispute.reason}</p>
                {dispute.resolutionNote && <p className="muted-text">Resolution note: {dispute.resolutionNote}</p>}
                {['open', 'in_review'].includes(dispute.status) ? (
                  <>
                    <label className="form-field">Resolution note
                      <textarea
                        className="form-control"
                        rows={3}
                        value={notes[dispute.id] ?? ''}
                        onChange={e => setNotes(current => ({ ...current, [dispute.id]: e.target.value }))}
                        placeholder="Explain the outcome for the customer"
                      />
                    </label>
                    <div className="form-row">
                      <button type="button" className="button small" disabled={busyId === dispute.id} onClick={() => void resolveDispute(dispute.id, 'resolved')}>Resolve</button>
                      <button type="button" className="button secondary small" disabled={busyId === dispute.id} onClick={() => void resolveDispute(dispute.id, 'rejected')}>Reject</button>
                    </div>
                  </>
                ) : dispute.resolvedAt ? <p className="muted-text">Closed {new Date(dispute.resolvedAt).toLocaleString()}</p> : null}
              </article>
            ))}
          </div>
        )
      )}
    </section>
  );
}
