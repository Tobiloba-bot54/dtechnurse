// File: DTECHNURSE-SITE-main/lib/server/supabase-auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/server/db';

export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase authentication is not configured.');
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(items) { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server components may not write cookies. */ } },
    },
  });
}

export async function requireAdmin() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, response: Response.json({ error: 'Authentication required.' }, { status: 401 }) };
  const db = getDatabase();
  if (!db) return { ok: false as const, response: Response.json({ error: 'Database is not configured.' }, { status: 503 }) };
  const profile = await db.prepare('SELECT role_key, account_status FROM users_profile WHERE id = ?').bind(data.user.id).first();
  if (!profile || profile.account_status !== 'active' || profile.role_key !== 'admin') return { ok: false as const, response: Response.json({ error: 'Administrator access required.' }, { status: 403 }) };
  return { ok: true as const, user: data.user, supabase };
}
