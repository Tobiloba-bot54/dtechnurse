// File: app/api/store/rewards/route.ts
// Loyalty points, referrals, and gift cards for the signed-in shopper.
import { requireUser } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getRewardsOverview } from '@/lib/services/store/engagement';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const rewards = await getRewardsOverview(auth.user.id);
    return Response.json({ rewards }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Your rewards could not be loaded.', 503);
  }
}
