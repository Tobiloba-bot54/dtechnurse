// File: DTECHNURSE-SITE-main/app/blog/[slug]/page.tsx
import Link from 'next/link';
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
  const editorSlug = article.editor_slug as string | null;
  const editorName = article.editor_name as string | null;
  const editorCredentials = article.editor_credentials as string | null;
  const editorAvatarUrl = article.editor_avatar_url as string | null;

  return (
    <main className="content-page">
      <span className="eyebrow">DTECHNURSE JOURNAL</span>
      <h1>{title}</h1>
      {dateLabel && <p className="admin-muted">{dateLabel}</p>}
      {editorName && (
        <Link href={`/editors/${editorSlug}`} className="article-byline">
          {editorAvatarUrl ? (
            <img src={editorAvatarUrl} alt="" className="article-byline-avatar" />
          ) : (
            <span className="article-byline-avatar article-byline-avatar-fallback" aria-hidden="true">{editorName.slice(0, 1).toUpperCase()}</span>
          )}
          <span>
            By <strong>{editorName}</strong>{editorCredentials ? `, ${editorCredentials}` : ''}
          </span>
        </Link>
      )}
      {excerpt && <p className="lead">{excerpt}</p>}
      <article className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </main>
  );
}
