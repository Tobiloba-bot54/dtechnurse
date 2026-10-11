'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
export default function ResourcePurchaseVerifier({ resourceSlug, reference }: { resourceSlug: string; reference: string }) {
  const [message, setMessage] = useState('Verifying your payment securely with Paystack…'); const [downloadUrl, setDownloadUrl] = useState('');
  useEffect(() => { let active = true; if (!reference || !resourceSlug) { setMessage('The payment reference or resource is missing.'); return; }
    fetch(`/api/resources/${encodeURIComponent(resourceSlug)}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Payment verification failed.'); if (active) { setDownloadUrl(`/api/resources/${encodeURIComponent(resourceSlug)}/download`); setMessage('Payment verified. Your resource is ready.'); } }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Payment verification failed.'); });
    return () => { active = false; };
  }, [resourceSlug, reference]);
  return <section className="resource-verify-card"><h1>Resource purchase</h1><p role="status">{message}</p>{downloadUrl && <Link className="button" href={downloadUrl}>Download your resource</Link>}<p><Link href="/dashboard">Go to my dashboard</Link> · <Link href="/resources">Browse resources</Link></p></section>;
}
