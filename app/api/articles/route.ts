// File: DTECHNURSE-SITE-main/app/api/articles/route.ts
import { listPublishedArticles } from '@/lib/services/content';
export async function GET() {
  try {
    const articles = await listPublishedArticles(20);
    return Response.json({ articles }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300, stale-if-error=86400' } });
  } catch {
    return Response.json({ error: 'Articles are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
