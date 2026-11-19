import { MessageCircle } from 'lucide-react';

export function WhatsAppChat({ enabled, number }: { enabled: boolean; number: string }) {
  if (!enabled || !number.trim()) return null;
  const digits = number.replace(/[^0-9]/g, '');
  if (!digits) return null;
  return (
    <a
      className="whats-app-fab"
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with DTECHNURSE support on WhatsApp"
    >
      <MessageCircle aria-hidden="true" />
      <span className="sr-only">Chat with DTECHNURSE support on WhatsApp</span>
    </a>
  );
}
