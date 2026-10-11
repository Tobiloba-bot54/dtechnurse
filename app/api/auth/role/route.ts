// File: DTECHNURSE-SITE-main/app/api/auth/role/route.ts
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return Response.json({ role: null }, { status: 401 });
  }
  const runtime = globalThis as typeof globalThis & { env?: { DB?: any }; DB?: any };
  const db = runtime.env?.DB ?? runtime.DB;
  if (!db) {
    return Response.json({ role: 'user' });
  }
  const profile = await db
    .prepare('SELECT role_key, account_status FROM users_profile WHERE id = ?')
    .bind(data.user.id)
    .first();
  if (!profile || profile.account_status !== 'active') {
    return Response.json({ role: 'user' });
  }
  return Response.json({ role: profile.role_key ?? 'user' });
}
