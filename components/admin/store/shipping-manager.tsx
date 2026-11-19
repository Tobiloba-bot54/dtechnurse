// File: DTECHNURSE-SITE-main/components/admin/store/shipping-manager.tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/services/http';
import { formatNaira } from '@/lib/services/store/types';

type ShippingLocation = { id: string; name: string; feeKobo: number | null; isActive: boolean };
type ShippingZone = { id: string; name: string; feeKobo: number; isActive: boolean; sortOrder: number; locations: ShippingLocation[] };
type LocationDraft = { id: string; name: string; fee: string; isActive: boolean };
type ZoneDraft = { id: string; name: string; fee: string; isActive: boolean; locations: LocationDraft[] };

function toKobo(naira: number): number { return Math.round(naira * 100); }
function fromKobo(kobo: number): number { return (Number(kobo) || 0) / 100; }

function toZoneDrafts(zones: ShippingZone[]): ZoneDraft[] {
  return zones.map(zone => ({
    id: zone.id,
    name: zone.name,
    fee: String(fromKobo(zone.feeKobo)),
    isActive: zone.isActive,
    locations: (zone.locations ?? []).map(location => ({ id: location.id, name: location.name, fee: location.feeKobo === null || location.feeKobo === undefined ? '' : String(fromKobo(location.feeKobo)), isActive: location.isActive })),
  }));
}

export function ShippingManager() {
  const [zones, setZones] = useState<ZoneDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ zones: ShippingZone[] }>('/api/admin/store/shipping');
      setZones(toZoneDrafts(data.zones ?? []));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Shipping zones could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateZone(zoneId: string, patch: Partial<ZoneDraft>) {
    setZones(current => current.map(zone => zone.id === zoneId ? { ...zone, ...patch } : zone));
  }

  function updateLocation(zoneId: string, locationId: string, patch: Partial<LocationDraft>) {
    setZones(current => current.map(zone => zone.id !== zoneId ? zone : { ...zone, locations: zone.locations.map(location => location.id === locationId ? { ...location, ...patch } : location) }));
  }

  async function save() {
    setSaving(true); setMessage(''); setError('');
    try {
      const payload = {
        zones: zones.map(zone => ({ id: zone.id, feeKobo: toKobo(Number(zone.fee || 0)), isActive: zone.isActive })),
        locations: zones.flatMap(zone => zone.locations.map(location => ({ id: location.id, feeKobo: location.fee.trim() === '' ? null : toKobo(Number(location.fee || 0)), isActive: location.isActive }))),
      };
      await apiRequest('/api/admin/store/shipping', { method: 'PUT', body: JSON.stringify(payload) });
      setMessage('Shipping fees saved.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Shipping fees could not be saved.');
    } finally { setSaving(false); }
  }

  return (
    <section className="store-admin" aria-label="Shipping fees">
      <div className="admin-toolbar">
        <button type="button" className="button small" onClick={() => void save()} disabled={saving || loading}>{saving ? 'Saving…' : 'Save shipping fees'}</button>
        <button type="button" className="button secondary small" onClick={() => void load()} disabled={loading || saving}>Refresh</button>
      </div>
      <p className="muted-text">Leave a state fee empty to use the zone fee. State fees override zone fees.</p>
      {message && <p className="success-text" role="status">{message}</p>}
      {error && <p className="danger-text" role="alert">{error}</p>}
      {loading ? <p className="admin-muted">Loading shipping zones…</p> : zones.length === 0 ? (
        <div className="empty-state">No shipping zones configured yet.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Zone</th><th>Zone fee (naira)</th><th>Active</th><th>States</th></tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone.id}>
                  <td><strong>{zone.name}</strong></td>
                  <td>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      step="any"
                      value={zone.fee}
                      aria-label={`Zone fee in naira for ${zone.name}`}
                      onChange={e => updateZone(zone.id, { fee: e.target.value })}
                    />
                  </td>
                  <td>
                    <button type="button" className={`chip ${zone.isActive ? 'active' : ''}`} onClick={() => updateZone(zone.id, { isActive: !zone.isActive })} aria-pressed={zone.isActive}>
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <details>
                      <summary>{zone.locations.length} states</summary>
                      {zone.locations.length > 0 ? (
                        <table className="admin-table">
                          <thead><tr><th>State</th><th>State fee (naira)</th><th>Active</th></tr></thead>
                          <tbody>
                            {zone.locations.map(location => (
                              <tr key={location.id}>
                                <td>{location.name}</td>
                                <td>
                                  <input
                                    className="form-control"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={location.fee}
                                    placeholder={`Zone fee (${formatNaira(toKobo(Number(zone.fee || 0)))})`}
                                    aria-label={`Shipping fee in naira for ${location.name}`}
                                    onChange={e => updateLocation(zone.id, location.id, { fee: e.target.value })}
                                  />
                                </td>
                                <td>
                                  <button type="button" className={`chip ${location.isActive ? 'active' : ''}`} onClick={() => updateLocation(zone.id, location.id, { isActive: !location.isActive })} aria-pressed={location.isActive}>
                                    {location.isActive ? 'Active' : 'Inactive'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <p className="muted-text">No states in this zone yet.</p>}
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
