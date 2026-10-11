// File: DTECHNURSE-SITE-main/app/api/auth/logout/route.ts
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';

export async function POST() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
