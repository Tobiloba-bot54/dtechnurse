// File: DTECHNURSE-SITE-main/components/mobile-nav-toggle.tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function MobileNavToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('nav-open', open);
    return () => document.body.classList.remove('nav-open');
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
      {mounted &&
        createPortal(
          <div id="mobile-menu" className="mobile-menu" data-open={open} onClick={() => setOpen(false)}>
            <div className="mobile-menu-sheet" onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
