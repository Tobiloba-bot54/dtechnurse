// File: DTECHNURSE-SITE-main/app/admin/page.tsx
import Link from 'next/link';
import AdminDashboard from '@/components/admin/admin-dashboard';
export const metadata = { title: 'Admin dashboard | DTECHNURSE' };
export default function AdminPage() {
  return <main className="content-page admin-page"><span className="eyebrow">ADMINISTRATION</span><h1>Content studio</h1><p className="lead">Create and publish articles, manage site settings, configure payments, and maintain the resource download centre.</p><p style={{ marginBottom: 24 }}><Link className="button small" href="/admin/store">Open store management</Link></p><AdminDashboard /></main>;
}
