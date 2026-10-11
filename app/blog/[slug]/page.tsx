// File: DTECHNURSE-SITE-main/app/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getPublishedArticle } from '@/lib/services/content';

type Params = { slug: string };

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: 'Article not found' };
  return {
    title: (article.seo_title as string) || (article.title as string),
    description: (article.seo_description as string) || (article.excerpt as string) || undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();

  const title = article.title as string;
  const excerpt = article.excerpt as string;
  const bodyHtml = article.body_html as string;
  const dateLabel = formatDate(article.published_at);

  return (
    <main className="content-page">
      <span className="eyebrow">DTECHNURSE JOURNAL</span>
      <h1>{title}</h1>
      {dateLabel && <p className="admin-muted">{dateLabel}</p>}
      {excerpt && <p className="lead">{excerpt}</p>}
      <article className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </main>
  );
}
