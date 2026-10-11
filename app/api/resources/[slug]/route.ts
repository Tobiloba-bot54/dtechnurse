import { getPublicResource } from '@/lib/services/resources';
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  try { const resource = await getPublicResource(slug); if (!resource) return Response.json({ error: 'Resource not found.' }, { status: 404 }); return Response.json({ resource }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }); }
  catch { return Response.json({ error: 'Resource is temporarily unavailable.' }, { status: 503 }); }
}
