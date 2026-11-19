// File: app/api/store/addresses/route.ts
// Saved delivery addresses for the signed-in shopper.
import { requireUser } from '@/lib/server/supabase-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { deleteAddress, listAddresses, saveAddress, updateAddress } from '@/lib/services/store/shipping';
import type { AddressInput } from '@/lib/services/store/types';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const addresses = await listAddresses(auth.user.id);
    return Response.json({ addresses }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your addresses could not be loaded.', 503);
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const input: AddressInput = {
    label: cleanText(body.label, 120),
    fullName: cleanText(body.fullName, 180),
    phone: cleanText(body.phone, 40),
    street: cleanText(body.street, 300),
    city: cleanText(body.city, 120),
    localGovernment: cleanText(body.localGovernment, 120),
    state: cleanText(body.state, 120),
    country: cleanText(body.country, 80) || 'Nigeria',
  };
  if (!input.fullName || !input.phone || !input.street || !input.city || !input.state) {
    return jsonError('Name, phone, street, city, and state are required for an address.', 400);
  }
  try {
    await saveAddress(auth.user.id, input);
    return Response.json({ addresses: await listAddresses(auth.user.id) }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The address could not be saved.', 400);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const id = cleanText(body.id, 100);
  if (!id) return jsonError('An address id is required.', 400);
  const patch: Partial<AddressInput> = {};
  if (body.label !== undefined && typeof body.label === 'string') patch.label = cleanText(body.label, 120);
  if (body.fullName !== undefined && typeof body.fullName === 'string') patch.fullName = cleanText(body.fullName, 180);
  if (body.phone !== undefined && typeof body.phone === 'string') patch.phone = cleanText(body.phone, 40);
  if (body.street !== undefined && typeof body.street === 'string') patch.street = cleanText(body.street, 300);
  if (body.city !== undefined && typeof body.city === 'string') patch.city = cleanText(body.city, 120);
  if (body.localGovernment !== undefined && typeof body.localGovernment === 'string') patch.localGovernment = cleanText(body.localGovernment, 120);
  if (body.state !== undefined && typeof body.state === 'string') patch.state = cleanText(body.state, 120);
  if (body.country !== undefined && typeof body.country === 'string') patch.country = cleanText(body.country, 80) || 'Nigeria';
  if (Object.keys(patch).length === 0) return jsonError('Provide at least one field to update.', 400);
  try {
    await updateAddress(auth.user.id, id, patch);
    return Response.json({ addresses: await listAddresses(auth.user.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The address could not be updated.', 400);
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const id = cleanText(url.searchParams.get('id'), 100);
  if (!id) return jsonError('An address id is required.', 400);
  try {
    await deleteAddress(auth.user.id, id);
    return Response.json({ addresses: await listAddresses(auth.user.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'The address could not be deleted.', 400);
  }
}
