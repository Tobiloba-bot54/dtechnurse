// File: app/api/resources/[slug]/download/route.ts
import { requireUser } from '@/lib/server/supabase-auth';
import { getAuthorizedResourceDownload } from '@/lib/services/resources';
import { jsonError } from '@/lib/server/validation';
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const auth = await requireUser(); if (!auth.ok) return auth.response;
  const { slug } = await context.params;
  try {
    const result = await getAuthorizedResourceDownload(slug, auth.user.id);
    if (result.kind === 'not-found') return jsonError('Resource not found.', 404);
    if (result.kind === 'purchase-required') return jsonError('A confirmed purchase is required to download this resource.', 403);
    if (result.kind !== 'ready') return jsonError('Download could not be recorded. Please try again.', 503);
    return Response.redirect(result.driveLink, 302);
  } catch { return jsonError('Download could not be recorded. Please try again.', 503); }
}
