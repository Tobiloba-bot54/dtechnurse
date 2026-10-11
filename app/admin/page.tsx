// File: DTECHNURSE-SITE-main/app/admin/page.tsx
import AdminDashboard from '@/components/admin/admin-dashboard';
export const metadata = { title: 'Admin dashboard | DTECHNURSE' };
export default function AdminPage() {
  return <main className="content-page admin-page"><span className="eyebrow">ADMINISTRATION</span><h1>Content studio</h1><p className="lead">Create, edit, preview and publish articles. Manage site pages and social links. Access is enforced by the protected admin API.</p><AdminDashboard /></main>;
}
