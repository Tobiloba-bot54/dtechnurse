// File: app/api/store/notifications/route.ts
// In-app notifications for the signed-in shopper.
import { requireUser } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { listNotifications, markNotificationsRead } from '@/lib/services/store/engagement';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const notifications = await listNotifications(auth.user.id, 20);
    return Response.json({ notifications }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your notifications could not be loaded.', 503);
  }
}

export async function POST() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    await markNotificationsRead(auth.user.id);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your notifications could not be updated.', 503);
  }
}
