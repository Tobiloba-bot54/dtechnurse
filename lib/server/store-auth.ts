// File: lib/server/store-auth.ts
// Store staff authorization for the DTECHNURSE STORE admin APIs.
import { getSupabaseServerClient } from './supabase-auth';
import { getDatabase } from './db';

export async function requireStoreStaff() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, response: Response.json({ error: 'Authentication required.' }, { status: 401 }) };
  const db = getDatabase();
  if (!db) return { ok: false as const, response: Response.json({ error: 'Database is not configured.' }, { status: 503 }) };
  const profile = await db.prepare('SELECT role_key, account_status FROM users_profile WHERE id = ?').bind(data.user.id).first<{ role_key: string; account_status: string }>();
  if (!profile || profile.account_status !== 'active' || (profile.role_key !== 'admin' && profile.role_key !== 'moderator')) return { ok: false as const, response: Response.json({ error: 'Store staff access required.' }, { status: 403 }) };
  return { ok: true as const, user: data.user, db, role: profile.role_key as 'admin' | 'moderator' };
}

export async function requireStoreAdmin() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, response: Response.json({ error: 'Authentication required.' }, { status: 401 }) };
  const db = getDatabase();
  if (!db) return { ok: false as const, response: Response.json({ error: 'Database is not configured.' }, { status: 503 }) };
  const profile = await db.prepare('SELECT role_key, account_status FROM users_profile WHERE id = ?').bind(data.user.id).first<{ role_key: string; account_status: string }>();
  if (!profile || profile.account_status !== 'active' || profile.role_key !== 'admin') return { ok: false as const, response: Response.json({ error: 'Administrator access required.' }, { status: 403 }) };
  return { ok: true as const, user: data.user, db, role: 'admin' as const };
}
