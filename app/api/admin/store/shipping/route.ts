// File: app/api/admin/store/shipping/route.ts
// Staff shipping zone browsing and admin fee toggling.
import { requireStoreAdmin, requireStoreStaff } from '@/lib/server/store-auth';
import { cleanText, jsonError } from '@/lib/server/validation';
import { listZonesWithLocations } from '@/lib/services/store/shipping';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  try {
    const zones = await listZonesWithLocations();
    return Response.json({ zones }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Shipping zones could not be loaded.', 503);
  }
}

export async function PUT(request: Request) {
  const auth = await requireStoreAdmin();
  if (!auth.ok) return auth.response;
  const db = auth.db;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const zoneInputs = (Array.isArray(body.zones) ? body.zones : []).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  const locationInputs = (Array.isArray(body.locations) ? body.locations : []).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  const zones = zoneInputs
    .map(item => {
      const feeKobo = Number(item.feeKobo);
      return { id: cleanText(item.id, 100), feeKobo, isActive: item.isActive === true };
    })
    .filter(zone => zone.id);
  for (const zone of zones) {
    if (!Number.isInteger(zone.feeKobo) || zone.feeKobo < 0) return jsonError('Zone fees must be whole amounts of zero or more.', 400);
  }
  const locations = locationInputs
    .map(item => {
      const fee = item.feeKobo;
      return { id: cleanText(item.id, 100), feeKobo: fee === null || fee === undefined || fee === '' ? null : Number(fee), isActive: item.isActive === true };
    })
    .filter(location => location.id);
  for (const location of locations) {
    if (location.feeKobo !== null && (!Number.isInteger(location.feeKobo) || location.feeKobo < 0)) return jsonError('Location fees must be whole amounts of zero or more.', 400);
  }
  if (!zones.length && !locations.length) return jsonError('Provide zone or location updates.', 400);
  try {
    if (zones.length) {
      const zoneIds = Array.from(new Set(zones.map(zone => zone.id)));
      const rows = await db.prepare(`SELECT id FROM shipping_zones WHERE id IN (${zoneIds.map(() => '?').join(', ')})`).bind(...zoneIds).all<{ id: string }>();
      if ((rows.results ?? []).length !== zoneIds.length) return jsonError('One or more shipping zones do not exist.', 404);
    }
    if (locations.length) {
      const locationIds = Array.from(new Set(locations.map(location => location.id)));
      const rows = await db.prepare(`SELECT id FROM shipping_locations WHERE id IN (${locationIds.map(() => '?').join(', ')})`).bind(...locationIds).all<{ id: string }>();
      if ((rows.results ?? []).length !== locationIds.length) return jsonError('One or more delivery states do not exist.', 404);
    }
    for (const zone of zones) {
      await db.prepare('UPDATE shipping_zones SET fee_kobo = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(zone.feeKobo, zone.isActive ? 1 : 0, zone.id).run();
    }
    for (const location of locations) {
      await db.prepare('UPDATE shipping_locations SET fee_kobo = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(location.feeKobo, location.isActive ? 1 : 0, location.id).run();
    }
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Shipping settings could not be saved.', 503);
  }
}
