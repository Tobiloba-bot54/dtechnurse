'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
export default function ResourceAction({ slug, pricing, autoAction = '' }: { slug: string; pricing: 'free' | 'paid'; autoAction?: 'download' | 'purchase' | '' }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const autoStarted = useRef(false);
  const intent = autoAction || (pricing === 'paid' ? 'purchase' : 'download');
  const next = `/resources/${slug}?${intent === 'purchase' ? 'purchase=1' : 'download=1'}`;
  async function act() {
    setBusy(true); setMessage('');
    try {
      if (pricing === 'free') {
        const session = await fetch('/api/auth/role', { cache: 'no-store' });
        if (session.status === 401) { setMessage('Sign in or create a free account to download this resource.'); return; }
        if (!session.ok) { setMessage('Something went wrong checking your account. Please try again.'); return; }
        window.location.assign(`/api/resources/${encodeURIComponent(slug)}/download`);
        return;
      }
      const response = await fetch(`/api/resources/${encodeURIComponent(slug)}/purchase`, { method: 'POST' }); const data = await response.json();
      if (response.status === 401) { setMessage('Sign in or create a free account to continue.'); return; }
      if (!response.ok) throw new Error(data.error || 'Checkout could not be started.');
      if (data.alreadyPurchased && data.downloadUrl) { window.location.assign(data.downloadUrl); return; }
      if (data.authorizationUrl) { window.location.assign(data.authorizationUrl); return; }
      throw new Error('Checkout could not be started.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); } finally { setBusy(false); }
  }
  useEffect(() => { if (autoAction && !autoStarted.current) { autoStarted.current = true; void act(); } }, [autoAction]);
  return <div className="resource-action"><p className="resource-account-note">A free DTECHNURSE account is required for all downloads.</p><button type="button" className="button" disabled={busy} onClick={act}>{busy ? 'Please wait…' : pricing === 'paid' ? 'Purchase and download' : 'Download resource'}</button>{message && <p className="form-error" role="alert">{message} <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link> or <Link href={`/signup?next=${encodeURIComponent(next)}`}>create an account</Link>.</p>}</div>;
}
