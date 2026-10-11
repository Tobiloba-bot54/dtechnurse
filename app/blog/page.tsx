import { listPublishedArticles } from '@/lib/services/content';
import BlogBrowser from '@/components/blog-browser';
export const metadata = { title: 'Blog and learning resources | DTECHNURSE', description: 'Explore nursing fundamentals, digital health, health informatics, telehealth, medical devices, and healthcare technology articles.' };
export const revalidate = 60;
export default async function BlogPage() {
  const articles = await listPublishedArticles(50).catch(() => []);
  return <main className="content-page blog-page">
    <span className="eyebrow">THE DTECHNURSE JOURNAL</span>
    <h1>Knowledge for better care and smarter technology.</h1>
    <p className="lead">Browse practical nursing resources, digital health insights, research, and career guidance. Search published articles or filter by a topic that matters to you.</p>
    <BlogBrowser articles={articles} />
  </main>;
}
