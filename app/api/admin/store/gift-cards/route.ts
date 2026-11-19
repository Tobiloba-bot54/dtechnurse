// File: app/api/admin/store/gift-cards/route.ts
// Admin gift card issuance and status management.
import { requireStoreAdmin } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import * as promotions from '@/lib/services/store/promotions';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  try {
    const items = await promotions.listGiftCards();
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Gift cards could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const initialAmountKobo = Number(body.initialAmountKobo);
  if (!Number.isInteger(initialAmountKobo) || initialAmountKobo <= 0) return jsonError('The gift card amount must be greater than zero.', 400);
  const expiresAtRaw = body.expiresAt;
  const expiresAt = expiresAtRaw === undefined || expiresAtRaw === null || expiresAtRaw === '' ? null : typeof expiresAtRaw === 'string' && !Number.isNaN(Date.parse(expiresAtRaw)) ? expiresAtRaw.trim() : '';
  if (expiresAt === '') return jsonError('The expiry date must be a valid date and time.', 400);
  try {
    const card = await promotions.createGiftCard({ initialAmountKobo, expiresAt });
    return Response.json({ id: card.id, code: card.code }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The gift card could not be created.', 400);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const id = cleanText(body.id, 100);
  if (!id) return jsonError('A gift card id is required.', 400);
  const status = cleanText(body.status, 40);
  if (!['active', 'redeemed', 'expired', 'disabled'].includes(status)) return jsonError('Unknown gift card status.', 400);
  try {
    await promotions.setGiftCardStatus(id, status);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The gift card could not be updated.', 400);
  }
}
