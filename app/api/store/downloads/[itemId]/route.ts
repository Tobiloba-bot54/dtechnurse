// File: app/api/store/downloads/[itemId]/route.ts
// Redirect the buyer of a digital order item to its downloadable file.
import { requireUser } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getPublicMediaBase } from '@/lib/server/storage';

export const runtime = 'nodejs';

const DOWNLOADABLE_STATUSES = ['paid', 'shipped', 'finished'];

export async function GET(_request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { itemId } = await context.params;
  try {
    const row = await auth.db
      .prepare(
        `SELECT o.user_id, o.status, l.is_digital, l.digital_file_key
         FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN listings l ON l.id = oi.listing_id
         WHERE oi.id = ? LIMIT 1`
      )
      .bind(itemId)
      .first<{ user_id: string; status: string; is_digital: number | null; digital_file_key: string | null }>();
    if (!row || row.user_id !== auth.user.id) return jsonError('Download not available.', 404);
    if (!DOWNLOADABLE_STATUSES.includes(row.status)) return jsonError('Download not available.', 404);
    if (row.is_digital !== 1 || !row.digital_file_key || !row.digital_file_key.trim()) return jsonError('Download not available.', 404);
    const key = row.digital_file_key.trim();
    if (/^https?:\/\//i.test(key)) return Response.redirect(key, 302);
    const publicBase = getPublicMediaBase();
    if (!publicBase) return jsonError('Download not available.', 404);
    return Response.redirect(`${publicBase.replace(/\/$/, '')}/${key.replace(/^\//, '')}`, 302);
  } catch {
    return jsonError('Download not available.', 404);
  }
}
