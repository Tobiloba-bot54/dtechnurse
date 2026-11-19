'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/services/http';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/services/store/types';

export function OrderVerify({ orderId, initialStatus }: { orderId: string; initialStatus: OrderStatus }) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const check = useCallback(() => {
    setBusy(true);
    setError('');
    apiRequest<{ status: OrderStatus; orderNumber: string }>('/api/store/checkout/verify', { method: 'POST', body: JSON.stringify({ orderId }) })
      .then(data => { setStatus(data.status); })
      .catch(err => { setError(err instanceof Error ? err.message : 'We could not confirm your payment right now.'); })
      .finally(() => { setBusy(false); });
  }, [orderId]);

  useEffect(() => { check(); }, [check]);

  return (
    <div className="order-verify">
      <p><span className={`status-pill ${status}`}>{ORDER_STATUS_LABELS[status] ?? status}</span></p>
      {status === 'pending_payment' && (
        <p role="status">We are confirming your payment{busy ? ', checking again…' : '…'}</p>
      )}
      {status === 'paid' && <p role="status">Payment confirmed. Thank you for your order.</p>}
      {status !== 'pending_payment' && status !== 'paid' && (
        <p role="status">This order is currently {ORDER_STATUS_LABELS[status]?.toLowerCase() ?? status}. You can follow progress on the order page.</p>
      )}
      {status === 'pending_payment' && <button type="button" className="button small" onClick={check} disabled={busy}>Retry</button>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
