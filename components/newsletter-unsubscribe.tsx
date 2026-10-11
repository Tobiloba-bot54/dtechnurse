'use client';
import { useState } from 'react';
export default function UnsubscribeForm({ token }: { token: string }) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function submit() { if (!token || busy) return; setBusy(true); setMessage(''); try { const response = await fetch('/api/newsletter/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not process request.'); setDone(true); setMessage(data.message || 'Subscription updated.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not process request.'); } finally { setBusy(false); } }
  return <div className="unsubscribe-box">{!token ? <p className="form-error" role="alert">This unsubscribe link is incomplete. Please use the link in your newsletter email.</p> : <><button className="button" type="button" onClick={submit} disabled={busy || done}>{busy ? 'Processing...' : done ? 'Subscription updated' : 'Unsubscribe me'}</button>{message && <p className={done ? 'form-success' : 'form-error'} role="status">{message}</p>}</>}</div>;
}
