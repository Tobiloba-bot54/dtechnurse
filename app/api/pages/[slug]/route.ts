// File: DTECHNURSE-SITE-main/app/api/pages/[slug]/route.ts
import { getEditablePage } from '@/lib/services/content';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';
export const revalidate = 60;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const page = await getEditablePage(slug);
  if (!page) return jsonError('Page not found.', 404);
  return Response.json({ page }, { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400' } });
}
