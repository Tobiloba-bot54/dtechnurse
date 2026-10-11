// File: DTECHNURSE-SITE-main/app/admin/page.tsx
import ArticleEditor from '@/components/admin/article-editor';
export const metadata = { title: 'Admin dashboard | DTECHNURSE' };
export default function AdminPage() {
  return <main className="content-page admin-page"><span className="eyebrow">ADMINISTRATION</span><h1>Content studio</h1><p className="lead">Create, edit, preview and publish articles. Access is enforced by the protected publishing API.</p><ArticleEditor /></main>;
}
