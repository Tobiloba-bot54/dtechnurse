// File: app/api/store/search/suggest/route.ts
// Public search autocomplete suggestions.
import { searchSuggest } from '@/lib/services/store/catalog';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return Response.json({ suggestions: [] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  try {
    const suggestions = await searchSuggest(q, 8);
    return Response.json({ suggestions }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch {
    return jsonError('Search suggestions are unavailable right now.', 503);
  }
}
