import { listPublicResources } from '@/lib/services/resources';
export async function GET(request: Request) {
  const url = new URL(request.url);
  try { const resources = await listPublicResources({ category: url.searchParams.get('category') ?? undefined, query: url.searchParams.get('q') ?? undefined }); return Response.json({ resources }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }); }
  catch { return Response.json({ error: 'Resources are temporarily unavailable.' }, { status: 503 }); }
}
