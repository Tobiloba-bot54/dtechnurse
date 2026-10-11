// File: DTECHNURSE-SITE-main/components/install-banner.tsx
'use client';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'dtechnurse-install-dismissed';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alreadyDismissed = window.localStorage.getItem(DISMISS_KEY);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (alreadyDismissed || isStandalone) return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install DTECHNURSE app">
      <p>Install the DTECHNURSE app for faster access and offline reading.</p>
      <div className="install-banner-actions">
        <button type="button" className="button small" onClick={install}>Install</button>
        <button type="button" className="text-link" onClick={dismiss}>Not now</button>
      </div>
    </div>
  );
}
