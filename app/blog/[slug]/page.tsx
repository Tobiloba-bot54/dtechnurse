import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedArticle, listRelatedArticles } from '@/lib/services/content';
import ArticleReader from '@/components/article-reader';
import { getAdminFeatureSettings } from '@/lib/services/features';
import { getDisplayImage } from '@/lib/media';

export const revalidate = 60;
type Params = { slug: string };
function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
function estimateReadingTime(html: string) {
  const words = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) return { title: 'Article not found' };
  const title = (article.seo_title as string) || (article.title as string);
  const description = (article.seo_description as string) || (article.excerpt as string) || undefined;
  const canonical = typeof article.canonical_url === 'string' && article.canonical_url ? article.canonical_url : `/blog/${slug}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, type: 'article', publishedTime: typeof article.published_at === 'string' ? article.published_at : undefined } };
}
export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();
  const title = article.title as string;
  const excerpt = article.excerpt as string;
  const bodyHtml = article.body_html as string;
  const dateLabel = formatDate(article.published_at);
  const updatedLabel = formatDate(article.updated_at);
  const editorSlug = article.editor_slug as string | null;
  const editorName = article.editor_name as string | null;
  const editorCredentials = article.editor_credentials as string | null;
  const editorAvatarUrl = article.editor_avatar_url as string | null;
  const featureSettings = await getAdminFeatureSettings();
  const related = featureSettings.relatedArticles ? await listRelatedArticles(article.id as string, 6).catch(() => []) : [];
  const minutes = estimateReadingTime(bodyHtml);
  return <main className="content-page article-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/blog">Articles</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
    <span className="eyebrow">DTECHNURSE JOURNAL</span>
    <h1>{title}</h1>
    <div className="article-meta"><span>{minutes} min read</span>{dateLabel && <span>Published {dateLabel}</span>}{updatedLabel && updatedLabel !== dateLabel && <span>Updated {updatedLabel}</span>}</div>
    {editorName && <Link href={`/editors/${editorSlug}`} className="article-byline">
      {editorAvatarUrl ? <img src={editorAvatarUrl} alt="" className="article-byline-avatar" /> : <span className="article-byline-avatar article-byline-avatar-fallback" aria-hidden="true">{editorName.slice(0, 1).toUpperCase()}</span>}
      <span>By <strong>{editorName}</strong>{editorCredentials ? `, ${editorCredentials}` : ''}</span>
    </Link>}
    {excerpt && <p className="lead">{excerpt}</p>}
    <ArticleReader articleId={article.id as string} bodyHtml={bodyHtml} title={title} />
    {related.length > 0 && <section className="related-articles" aria-labelledby="related-heading">
      <div className="home-articles-head"><div><span className="eyebrow">KEEP LEARNING</span><h2 id="related-heading">Related articles</h2></div><Link href="/blog" className="text-link">Explore all articles</Link></div>
      <div className="home-articles-grid">{related.map(item => <Link key={item.id} href={`/blog/${item.slug}`} className="home-article-card">
        <div className="home-article-media home-article-media-image"><img src={getDisplayImage(item.featured_media_url)} alt={item.featured_media_alt || ''} loading="lazy" /></div>
        <div className="home-article-body"><h3>{item.title}</h3>{item.excerpt && <p>{item.excerpt}</p>}</div>
      </Link>)}</div>
    </section>}
  </main>;
}
