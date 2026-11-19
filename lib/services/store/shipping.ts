
import { getDatabase } from '@/lib/server/db';
import { getStoreSettings } from './settings';
import { getOrCreateCart } from './cart';
import type { AddressInput, AddressRecord, ShippingQuote } from './types';

export type ShippingLocationSummary = { id: string; name: string; feeKobo: number | null; isActive: boolean; sortOrder: number };
export type ShippingZoneWithLocations = { id: string; name: string; feeKobo: number; isActive: boolean; sortOrder: number; locations: ShippingLocationSummary[] };

export async function listZonesWithLocations(): Promise<ShippingZoneWithLocations[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT z.id AS zone_id, z.name AS zone_name, z.fee_kobo AS zone_fee, z.is_active AS zone_active, z.sort_order AS zone_sort,
              l.id AS location_id, l.name AS location_name, l.fee_kobo AS location_fee, l.is_active AS location_active, l.sort_order AS location_sort
       FROM shipping_zones z LEFT JOIN shipping_locations l ON l.zone_id = z.id
       ORDER BY z.sort_order ASC, z.name ASC, l.sort_order ASC, l.name ASC`
    )
    .all<{
      zone_id: string; zone_name: string; zone_fee: number; zone_active: number; zone_sort: number;
      location_id: string | null; location_name: string | null; location_fee: number | null; location_active: number | null; location_sort: number | null;
    }>();
  const zones = new Map<string, ShippingZoneWithLocations>();
  for (const row of rows.results ?? []) {
    let zone = zones.get(row.zone_id);
    if (!zone) {
      zone = { id: row.zone_id, name: row.zone_name, feeKobo: Number(row.zone_fee), isActive: row.zone_active === 1, sortOrder: Number(row.zone_sort), locations: [] };
      zones.set(row.zone_id, zone);
    }
    if (row.location_id) {
      zone.locations.push({ id: row.location_id, name: row.location_name ?? '', feeKobo: row.location_fee === null || row.location_fee === undefined ? null : Number(row.location_fee), isActive: row.location_active === 1, sortOrder: Number(row.location_sort ?? 0) });
    }
  }
  return Array.from(zones.values());
}

export async function quoteShipping(userId: string, stateName: string): Promise<ShippingQuote | null> {
  const db = getDatabase();
  if (!db || !stateName.trim()) return null;
  const settings = await getStoreSettings();
  const location = await db
    .prepare(
      `SELECT l.id, l.name AS state_name, l.fee_kobo AS loc_fee, l.zone_id, z.name AS zone_name, z.fee_kobo AS zone_fee
       FROM shipping_locations l JOIN shipping_zones z ON z.id = l.zone_id
       WHERE lower(l.name) = lower(?) AND l.is_active = 1 AND z.is_active = 1 LIMIT 1`
    )
    .bind(stateName.trim())
    .first<{ id: string; state_name: string; loc_fee: number | null; zone_id: string; zone_name: string; zone_fee: number }>();
  if (!location) return null;
  let feeKobo = location.loc_fee !== null && location.loc_fee !== undefined ? Number(location.loc_fee) : Number(location.zone_fee);
  const cart = await getOrCreateCart(userId);
  const lineRows = await db
    .prepare(`SELECT l.is_digital, l.is_free_shipping FROM cart_items ci JOIN listings l ON l.id = ci.listing_id WHERE ci.cart_id = ? AND l.status = 'published'`)
    .bind(cart.id)
    .all<{ is_digital: number; is_free_shipping: number }>();
  const lines = lineRows.results ?? [];
  const digitalOnly = lines.length > 0 && lines.every(line => line.is_digital === 1);
  const allItemsFreeShipping = lines.length > 0 && (settings.freeShippingRequiresAllItems ? lines.every(line => line.is_free_shipping === 1) : lines.some(line => line.is_free_shipping === 1));
  if (!settings.regionShippingEnabled) feeKobo = 0;
  else if (digitalOnly || (lines.length > 0 && allItemsFreeShipping)) feeKobo = 0;
  return { zoneId: location.zone_id, zoneName: location.zone_name, locationId: location.id, stateName: location.state_name, feeKobo, allItemsFreeShipping, digitalOnly };
}

type AddressRow = { id: string; label: string; full_name: string; phone: string; street: string; city: string; local_government: string; state: string; country: string; is_default: number };

function mapAddress(row: AddressRow): AddressRecord {
  return { id: row.id, label: row.label, fullName: row.full_name, phone: row.phone, street: row.street, city: row.city, localGovernment: row.local_government, state: row.state, country: row.country, isDefault: row.is_default === 1 };
}

export async function listAddresses(userId: string): Promise<AddressRecord[]> {
  const db = getDatabase();
  if (!db) return [];
  const rows = await db.prepare('SELECT id, label, full_name, phone, street, city, local_government, state, country, is_default FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').bind(userId).all<AddressRow>();
  return (rows.results ?? []).map(mapAddress);
}

export async function saveAddress(userId: string, input: AddressInput): Promise<AddressRecord> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  if (!input.fullName.trim() || !input.phone.trim() || !input.street.trim() || !input.state.trim()) throw new Error('Name, phone, street, and state are required for an address.');
  const countRow = await db.prepare('SELECT COUNT(*) AS total FROM customer_addresses WHERE user_id = ?').bind(userId).first<{ total: number }>();
  const isDefault = Number(countRow?.total ?? 0) === 0 ? 1 : 0;
  const id = crypto.randomUUID();
  await db
    .prepare('INSERT INTO customer_addresses (id, user_id, label, full_name, phone, street, city, local_government, state, country, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)')
    .bind(id, userId, input.label ?? '', input.fullName.trim().slice(0, 180), input.phone.trim().slice(0, 40), input.street.trim().slice(0, 300), input.city.trim().slice(0, 120), (input.localGovernment ?? '').trim().slice(0, 120), input.state.trim().slice(0, 120), (input.country ?? 'Nigeria').trim().slice(0, 80) || 'Nigeria', isDefault)
    .run();
  const row = await db.prepare('SELECT id, label, full_name, phone, street, city, local_government, state, country, is_default FROM customer_addresses WHERE id = ? LIMIT 1').bind(id).first<AddressRow>();
  if (!row) throw new Error('The address could not be saved.');
  return mapAddress(row);
}

export async function updateAddress(userId: string, id: string, patch: Partial<AddressInput>): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.label !== undefined) { sets.push('label = ?'); values.push(patch.label.slice(0, 120)); }
  if (patch.fullName !== undefined) { sets.push('full_name = ?'); values.push(patch.fullName.trim().slice(0, 180)); }
  if (patch.phone !== undefined) { sets.push('phone = ?'); values.push(patch.phone.trim().slice(0, 40)); }
  if (patch.street !== undefined) { sets.push('street = ?'); values.push(patch.street.trim().slice(0, 300)); }
  if (patch.city !== undefined) { sets.push('city = ?'); values.push(patch.city.trim().slice(0, 120)); }
  if (patch.localGovernment !== undefined) { sets.push('local_government = ?'); values.push(patch.localGovernment.trim().slice(0, 120)); }
  if (patch.state !== undefined) { sets.push('state = ?'); values.push(patch.state.trim().slice(0, 120)); }
  if (patch.country !== undefined) { sets.push('country = ?'); values.push(patch.country.trim().slice(0, 80) || 'Nigeria'); }
  if (!sets.length) return;
  await db.prepare(`UPDATE customer_addresses SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).bind(...values, id, userId).run();
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const existing = await db.prepare('SELECT id, is_default FROM customer_addresses WHERE id = ? AND user_id = ? LIMIT 1').bind(id, userId).first<{ id: string; is_default: number }>();
  if (!existing) return;
  await db.prepare('DELETE FROM customer_addresses WHERE id = ? AND user_id = ?').bind(id, userId).run();
  if (existing.is_default === 1) {
    await db
      .prepare('UPDATE customer_addresses SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = (SELECT id FROM customer_addresses WHERE user_id = ? ORDER BY created_at DESC, updated_at DESC LIMIT 1)')
      .bind(userId, userId)
      .run();
  }
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  await db.prepare('UPDATE customer_addresses SET is_default = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').bind(userId).run();
  await db.prepare('UPDATE customer_addresses SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND id = ?').bind(userId, id).run();
}
