import ArticleEditor from '@/components/admin/article-editor';
export const metadata = { title: 'Article editor | DTECHNURSE' };
export default function EditorPage() {
  return <main className="content-page admin-page">
    <span className="eyebrow">PUBLISHING WORKSPACE</span>
    <h1>Article editor</h1>
    <p className="lead">Create and edit articles, manage metadata, preview content, and publish when ready.</p>
    <ArticleEditor />
  </main>;
}
