// File: DTECHNURSE-SITE-main/components/newsletter-signup.tsx
'use client';
import { useState, type FormEvent } from 'react';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'busy') return;
    setStatus('busy');
    setMessage('');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not subscribe.');
      setStatus('done');
      setMessage(data.message || "You're subscribed.");
      setEmail('');
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Could not subscribe.');
    }
  };

  return (
    <section className="newsletter-signup" aria-label="Subscribe to the DTECHNURSE newsletter">
      <div className="newsletter-copy">
        <span className="eyebrow">STAY IN THE LOOP</span>
        <h2>Get nursing &amp; tech insights in your inbox</h2>
        <p>A regular digest of new articles on clinical workflow, health tech and career growth. No spam, unsubscribe anytime.</p>
      </div>
      <form className="newsletter-form" onSubmit={onSubmit}>
        <div className="newsletter-field-row">
          <label className="sr-only" htmlFor="newsletter-email">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            maxLength={254}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'busy'}
          />
          <input
            type="text"
            name="website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="newsletter-honeypot"
          />
          <button type="submit" className="button" disabled={status === 'busy'}>
            {status === 'busy' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </div>
        {message && (
          <p className={status === 'error' ? 'form-error' : 'form-success'} role="status">{message}</p>
        )}
      </form>
    </section>
  );
}
