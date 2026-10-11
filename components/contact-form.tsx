// File: DTECHNURSE-SITE-main/components/contact-form.tsx
'use client';
import { FormEvent, useState } from 'react';
export default function ContactForm() {
  const [state, setState] = useState<{ busy: boolean; message: string; error: boolean }>({ busy: false, message: '', error: false });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState({ busy: true, message: '', error: false });
    const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your message could not be sent.');
      form.reset(); setState({ busy: false, message: result.message || 'Your message has been received.', error: false });
    } catch (error) { setState({ busy: false, message: error instanceof Error ? error.message : 'Your message could not be sent.', error: true }); }
  }
  return <form className="contact-form" onSubmit={submit}>
    <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} /></label>
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Subject<input name="subject" maxLength={160} /></label>
    <label>Message<textarea name="message" rows={6} required minLength={10} maxLength={5000} /></label>
    <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <button className="button button-primary" disabled={state.busy}>{state.busy ? 'Sending message...' : 'Send message'}</button>
    {state.message && <p role="status" className={state.error ? 'form-error' : 'form-success'}>{state.message}</p>}
  </form>;
}
