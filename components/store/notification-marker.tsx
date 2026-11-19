'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/services/http';

export function NotificationMarker() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    apiRequest('/api/store/notifications', { method: 'POST' })
      .then(() => { if (active) router.refresh(); })
      .catch(() => { /* Marking notifications read is best effort. */ });
    return () => { active = false; };
  }, [router]);
  return null;
}
