// File: DTECHNURSE-SITE-main/components/logout-button.tsx
'use client';
import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  async function handleLogout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.assign('/');
    }
  }
  return (
    <button type="button" className="text-link" onClick={handleLogout} disabled={busy}>
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  );
}
