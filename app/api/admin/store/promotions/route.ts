// File: app/api/admin/store/promotions/route.ts
// Admin coupon, flash deal, and listing discount management.
import { requireStoreAdmin } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import * as promotions from '@/lib/services/store/promotions';
import type { CouponInput } from '@/lib/services/store/promotions';

export const runtime = 'nodejs';

type DiscountType = 'percentage' | 'fixed';

function parseDiscountType(value: unknown): DiscountType | '' {
  return value === 'fixed' ? 'fixed' : value === 'percentage' ? 'percentage' : '';
}

function parseDiscountValue(value: unknown, discountType: DiscountType | ''): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  if (discountType === 'percentage' && parsed > 100) return null;
  return parsed;
}

function parseWhen(value: unknown, field: string): { value: string | null } | { error: string } {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return { error: `The ${field} must be a valid date and time.` };
  return { value: value.trim() };
}

function promotionType(value: string | null): 'coupon' | 'deal' | 'discount' | '' {
  return value === 'coupon' || value === 'deal' || value === 'discount' ? value : '';
}

export async function GET(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const type = promotionType(cleanText(url.searchParams.get('type'), 20) || 'coupon');
  if (!type) return jsonError('Unknown promotion type.', 400);
  try {
    if (type === 'coupon') return Response.json({ items: await promotions.listCoupons() }, { headers: { 'Cache-Control': 'no-store' } });
    if (type === 'deal') return Response.json({ items: await promotions.listFlashDeals() }, { headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ items: await promotions.listListingDiscounts() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Promotions could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const type = promotionType(cleanText(url.searchParams.get('type'), 20));
  if (!type) return jsonError('Unknown promotion type.', 400);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const discountType = parseDiscountType(body.discountType);
  if (!discountType) return jsonError('The discount type must be percentage or fixed.', 400);
  const discountValue = parseDiscountValue(body.discountValue, discountType);
  if (discountValue === null) return jsonError('The discount value must be a whole number greater than zero, and no more than 100 for a percentage.', 400);
  const isActive = body.isActive === true;
  const startsAt = parseWhen(body.startsAt, 'start date');
  if ('error' in startsAt) return jsonError(startsAt.error, 400);
  const endsAt = parseWhen(body.endsAt, 'end date');
  if ('error' in endsAt) return jsonError(endsAt.error, 400);
  try {
    if (type === 'coupon') {
      const code = cleanText(body.code, 60).toUpperCase();
      if (!code) return jsonError('A coupon code is required.', 400);
      const minOrderAmountKobo = Number(body.minOrderAmountKobo);
      if (!Number.isInteger(minOrderAmountKobo) || minOrderAmountKobo < 0) return jsonError('The minimum order amount must be a whole amount of zero or more.', 400);
      const maxUsesRaw = body.maxUses;
      const maxUses = maxUsesRaw === null || maxUsesRaw === undefined || maxUsesRaw === '' ? null : Number(maxUsesRaw);
      if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 0)) return jsonError('The usage limit must be a whole number of zero or more.', 400);
      const perUserLimitRaw = Number(body.perUserLimit);
      const perUserLimit = Number.isInteger(perUserLimitRaw) && perUserLimitRaw >= 0 ? perUserLimitRaw : 1;
      const coupon = await promotions.createCoupon({
        code,
        description: cleanText(body.description, 500),
        discountType,
        discountValue,
        minOrderAmountKobo,
        maxUses,
        perUserLimit,
        startsAt: startsAt.value,
        endsAt: endsAt.value,
        isActive,
      });
      return Response.json({ id: coupon.id }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    const listingId = cleanText(body.listingId, 100);
    if (!listingId) return jsonError('Choose the product this promotion applies to.', 400);
    if (type === 'deal') {
      if (!startsAt.value || !endsAt.value) return jsonError('A flash deal needs a start and end time.', 400);
      await promotions.createFlashDeal({ listingId, discountType, discountValue, startsAt: startsAt.value, endsAt: endsAt.value, isActive });
      return Response.json({ id: '' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    await promotions.createListingDiscount({ listingId, discountType, discountValue, startsAt: startsAt.value, endsAt: endsAt.value, isActive });
    return Response.json({ id: '' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The promotion could not be saved.', 400);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const type = promotionType(cleanText(url.searchParams.get('type'), 20));
  if (!type) return jsonError('Unknown promotion type.', 400);
  const id = cleanText(url.searchParams.get('id'), 100);
  if (!id) return jsonError('A promotion id is required.', 400);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  try {
    if (type === 'coupon') {
      const patch: Partial<CouponInput> = {};
      if (body.code !== undefined) {
        const code = cleanText(body.code, 60).toUpperCase();
        if (!code) return jsonError('A coupon code cannot be empty.', 400);
        patch.code = code;
      }
      if (body.description !== undefined) patch.description = cleanText(body.description, 500);
      if (body.discountType !== undefined) {
        const nextType = parseDiscountType(body.discountType);
        if (!nextType) return jsonError('The discount type must be percentage or fixed.', 400);
        patch.discountType = nextType;
      }
      if (body.discountValue !== undefined) {
        const nextValue = parseDiscountValue(body.discountValue, patch.discountType ?? parseDiscountType(body.discountType));
        if (nextValue === null) return jsonError('The discount value must be a whole number greater than zero, and no more than 100 for a percentage.', 400);
        patch.discountValue = nextValue;
      }
      if (body.minOrderAmountKobo !== undefined) {
        const minOrderAmountKobo = Number(body.minOrderAmountKobo);
        if (!Number.isInteger(minOrderAmountKobo) || minOrderAmountKobo < 0) return jsonError('The minimum order amount must be a whole amount of zero or more.', 400);
        patch.minOrderAmountKobo = minOrderAmountKobo;
      }
      if (body.maxUses !== undefined) {
        const maxUsesRaw = body.maxUses;
        const maxUses = maxUsesRaw === null || maxUsesRaw === '' ? null : Number(maxUsesRaw);
        if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 0)) return jsonError('The usage limit must be a whole number of zero or more.', 400);
        patch.maxUses = maxUses;
      }
      if (body.perUserLimit !== undefined) {
        const perUserLimit = Number(body.perUserLimit);
        if (!Number.isInteger(perUserLimit) || perUserLimit < 0) return jsonError('The per-user limit must be a whole number of zero or more.', 400);
        patch.perUserLimit = perUserLimit;
      }
      if (body.startsAt !== undefined) {
        const nextStartsAt = parseWhen(body.startsAt, 'start date');
        if ('error' in nextStartsAt) return jsonError(nextStartsAt.error, 400);
        patch.startsAt = nextStartsAt.value;
      }
      if (body.endsAt !== undefined) {
        const nextEndsAt = parseWhen(body.endsAt, 'end date');
        if ('error' in nextEndsAt) return jsonError(nextEndsAt.error, 400);
        patch.endsAt = nextEndsAt.value;
      }
      if (body.isActive !== undefined) patch.isActive = body.isActive === true;
      if (Object.keys(patch).length === 0) return jsonError('Provide at least one field to update.', 400);
      await promotions.updateCoupon(id, patch);
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const listingId = cleanText(body.listingId, 100);
    if (body.listingId !== undefined && !listingId) return jsonError('Choose the product this promotion applies to.', 400);
    const nextType = body.discountType === undefined ? '' : parseDiscountType(body.discountType);
    if (body.discountType !== undefined && !nextType) return jsonError('The discount type must be percentage or fixed.', 400);
    const nextValue = body.discountValue === undefined ? null : parseDiscountValue(body.discountValue, nextType);
    if (body.discountValue !== undefined && nextValue === null) return jsonError('The discount value must be a whole number greater than zero, and no more than 100 for a percentage.', 400);
    const nextStartsAt = parseWhen(body.startsAt, 'start date');
    if ('error' in nextStartsAt) return jsonError(nextStartsAt.error, 400);
    const nextEndsAt = parseWhen(body.endsAt, 'end date');
    if ('error' in nextEndsAt) return jsonError(nextEndsAt.error, 400);
    if (type === 'deal') {
      if ((body.startsAt !== undefined && !nextStartsAt.value) || (body.endsAt !== undefined && !nextEndsAt.value)) return jsonError('A flash deal needs a start and end time.', 400);
      const patch: Partial<{ listingId: string; discountType: 'percentage' | 'fixed'; discountValue: number; startsAt: string; endsAt: string; isActive: boolean }> = {};
      if (body.listingId !== undefined) patch.listingId = listingId;
      if (body.discountType !== undefined) patch.discountType = nextType || 'percentage';
      if (body.discountValue !== undefined) patch.discountValue = nextValue ?? 1;
      if (body.startsAt !== undefined) patch.startsAt = nextStartsAt.value ?? '';
      if (body.endsAt !== undefined) patch.endsAt = nextEndsAt.value ?? '';
      if (body.isActive !== undefined) patch.isActive = body.isActive === true;
      if (Object.keys(patch).length === 0) return jsonError('Provide at least one field to update.', 400);
      await promotions.updateFlashDeal(id, patch);
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const patch: Partial<{ listingId: string; discountType: 'percentage' | 'fixed'; discountValue: number; startsAt?: string | null; endsAt?: string | null; isActive: boolean }> = {};
    if (body.listingId !== undefined) patch.listingId = listingId;
    if (body.discountType !== undefined) patch.discountType = nextType || 'percentage';
    if (body.discountValue !== undefined) patch.discountValue = nextValue ?? 1;
    if (body.startsAt !== undefined) patch.startsAt = nextStartsAt.value;
    if (body.endsAt !== undefined) patch.endsAt = nextEndsAt.value;
    if (body.isActive !== undefined) patch.isActive = body.isActive === true;
    if (Object.keys(patch).length === 0) return jsonError('Provide at least one field to update.', 400);
    await promotions.updateListingDiscount(id, patch);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The promotion could not be updated.', 400);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const type = promotionType(cleanText(url.searchParams.get('type'), 20));
  if (!type) return jsonError('Unknown promotion type.', 400);
  const id = cleanText(url.searchParams.get('id'), 100);
  if (!id) return jsonError('A promotion id is required.', 400);
  try {
    if (type === 'coupon') await promotions.deleteCoupon(id);
    else if (type === 'deal') await promotions.deleteFlashDeal(id);
    else await promotions.deleteListingDiscount(id);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The promotion could not be deleted.', 400);
  }
}
