// File: DTECHNURSE-SITE-main/components/site-header.tsx
import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { getDatabase } from '@/lib/server/db';
import { LogoutButton } from '@/components/logout-button';

export async function SiteHeader() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  let isAdmin = false;
  if (user) {
    const db = getDatabase();
    if (db) {
      const profile = await db
        .prepare('SELECT role_key, account_status FROM users_profile WHERE id = ?')
        .bind(user.id)
        .first<{ role_key: string; account_status: string }>();
      isAdmin = Boolean(profile && profile.account_status === 'active' && profile.role_key === 'admin');
    }
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="DTECHNURSE home">
        <img src="/dtechnurse-logo.jpg" alt="DTECHNURSE, Health Tech Impact" />
        <span>DTECHNURSE</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/blog">Blog</Link>
        <Link href="/resources">Resources</Link>
        <Link href="/contact">Contact</Link>
      </nav>
      <div className="header-actions">
        {user ? (
          <>
            <Link className="text-link" href="/dashboard">My downloads</Link>
            {isAdmin && <Link className="text-link" href="/admin">Admin</Link>}
            <LogoutButton />
          </>
        ) : (
          <>
            <Link className="text-link" href="/login">Log in</Link>
            <Link className="button small" href="/signup">Create account</Link>
          </>
        )}
      </div>
    </header>
  );
}
