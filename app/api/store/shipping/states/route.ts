// File: app/api/store/shipping/states/route.ts
// Public list of active delivery states.
import { listZonesWithLocations } from '@/lib/services/store/shipping';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const zones = await listZonesWithLocations();
    const states = Array.from(new Set(
      zones
        .filter(zone => zone.isActive)
        .flatMap(zone => zone.locations.filter(location => location.isActive))
        .map(location => location.name.trim())
        .filter(name => name.length > 0)
    )).sort((a, b) => a.localeCompare(b));
    return Response.json({ states }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch {
    return jsonError('Delivery states could not be loaded right now.', 503);
  }
}
