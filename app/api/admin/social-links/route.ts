// File: DTECHNURSE-SITE-main/app/api/admin/social-links/route.ts
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';
import { getSocialLinks, saveSocialLinks, type SocialLink } from '@/lib/services/site-settings';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const links = await getSocialLinks();
  return Response.json({ socialLinks: links }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError('Invalid JSON body.', 400); }
  const incoming = body.socialLinks;
  if (!Array.isArray(incoming)) return jsonError('socialLinks must be an array.', 400);
  const links: SocialLink[] = incoming
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => ({
      platform: typeof item.platform === 'string' ? item.platform : '',
      url: typeof item.url === 'string' ? item.url : '',
      enabled: item.enabled !== false,
    }));
  const invalid = links.find(link => link.platform && !/^https?:\/\//i.test(link.url));
  if (invalid) return jsonError(`"${invalid.platform}" needs a valid http(s) URL.`, 400);
  try {
    await saveSocialLinks(links);
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Could not save social links. Check whether migrations have been applied.', 409);
  }
}
