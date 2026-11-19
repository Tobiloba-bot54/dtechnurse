'use client';
import { useState } from 'react';
import { Copy } from 'lucide-react';

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* Clipboard is unavailable in this browser. */ }
  }

  return (
    <span className="referral-code-box">
      <span className="code-chip">{code}</span>
      <button type="button" className="button small" onClick={copy}>
        <Copy size={14} aria-hidden="true" /> {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </span>
  );
}
