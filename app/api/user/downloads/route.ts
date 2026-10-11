import { requireUser } from '@/lib/server/supabase-auth';
import { getUserResourceLibrary } from '@/lib/services/user-library';
import { jsonError } from '@/lib/server/validation';
export async function GET() {
  const auth = await requireUser(); if (!auth.ok) return auth.response;
  try { return Response.json(await getUserResourceLibrary(auth.user.id), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return jsonError('Your resource library could not be loaded. Apply the resource database migration and try again.', 503); }
}
