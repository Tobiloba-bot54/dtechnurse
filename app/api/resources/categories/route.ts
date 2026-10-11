import { listResourceCategories } from '@/lib/services/resources';
export async function GET() { try { return Response.json({ categories: await listResourceCategories() }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }); } catch { return Response.json({ categories: [] }); } }
