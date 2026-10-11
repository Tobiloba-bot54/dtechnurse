// File: DTECHNURSE-SITE-main/app/admin/editor/page.tsx
import Link from 'next/link';
export const metadata = { title: 'Article editor | DTECHNURSE' };
export default function EditorPage() {
  return <main className="content-page"><span className="eyebrow">PUBLISHING WORKSPACE</span><h1>Article editor</h1><p className="lead">The secure publishing API and content revision foundation are ready for configuration.</p><div className="notice-card"><strong>Publishing requires verified administrator access.</strong><p>Article create and list requests use the server-side Supabase session, check the D1 user profile role, and sanitise HTML before storage. Apply migration 0003 before saving articles.</p><p>The editor interface will be connected after authentication and database bindings are configured.</p><Link className="text-link" href="/admin">Return to administration</Link></div></main>;
}
