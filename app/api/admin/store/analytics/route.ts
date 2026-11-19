// File: app/api/admin/store/analytics/route.ts
// Staff store analytics overview.
import { requireStoreStaff } from '@/lib/server/store-auth';
import { jsonError } from '@/lib/server/validation';
import { getStoreAnalytics } from '@/lib/services/store/engagement';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireStoreStaff();
  if (!auth.ok) return auth.response;
  try {
    const analytics = await getStoreAnalytics();
    return Response.json(
      {
        analytics: {
          ...analytics,
          topProducts: analytics.topProducts.map(product => ({ title: product.title, quantitySold: product.quantity, revenueKobo: product.revenueKobo })),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Analytics could not be loaded.', 503);
  }
}
