// File: app/api/admin/store/inventory/route.ts
// Staff inventory logs and low stock alerts.
import { requireStoreStaff } from '@/lib/server/store-auth';
import { jsonError } from '@/lib/server/validation';
import { getStoreAnalytics } from '@/lib/services/store/engagement';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  try {
    const analytics = await getStoreAnalytics();
    return Response.json({ logs: analytics.inventoryLogs, lowStock: analytics.lowStock }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Inventory could not be loaded.', 503);
  }
}
