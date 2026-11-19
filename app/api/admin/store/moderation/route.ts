// File: app/api/admin/store/moderation/route.ts
// Staff review and dispute moderation.
import { requireStoreStaff } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import * as engagement from '@/lib/services/store/engagement';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const type = cleanText(url.searchParams.get('type'), 20);
  const status = cleanText(url.searchParams.get('status'), 40);
  try {
    if (type === 'reviews') return Response.json({ items: await engagement.listReviews(status || undefined) }, { headers: { 'Cache-Control': 'no-store' } });
    if (type === 'disputes') return Response.json({ items: await engagement.listDisputes(status || undefined) }, { headers: { 'Cache-Control': 'no-store' } });
    return jsonError('Unknown moderation type.', 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Moderation queue could not be loaded.', 503);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const type = cleanText(body.type, 20);
  const id = cleanText(body.id, 100);
  if (!id) return jsonError('An id is required.', 400);
  try {
    if (type === 'reviews') {
      const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : '';
      if (!status) return jsonError('Review moderation must be approved or rejected.', 400);
      await engagement.moderateReview(id, status, auth.user.id);
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (type === 'disputes') {
      const status = body.status === 'resolved' ? 'resolved' : body.status === 'rejected' ? 'rejected' : '';
      if (!status) return jsonError('Dispute resolution must be resolved or rejected.', 400);
      const resolutionNote = cleanText(body.resolutionNote, 2000);
      await engagement.resolveDispute(id, { status, resolutionNote }, auth.user.id);
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return jsonError('Unknown moderation type.', 400);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The moderation decision could not be saved.', 400);
  }
}
