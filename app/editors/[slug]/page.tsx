import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEditorBySlug, parseEditorSocialLinks } from '@/lib/services/editors';
import { listPublishedArticlesByEditor } from '@/lib/services/content';
import { SocialIcon } from '@/components/social-icon';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const editor = await getEditorBySlug(slug);
  if (!editor || editor.status !== 'active') return { title: 'Editor not found' };
  return {
    title: editor.display_name,
    description: editor.bio || undefined,
  };
}

export default async function EditorProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const editor = await getEditorBySlug(slug);
  if (!editor || editor.status !== 'active') notFound();

  const articles = await listPublishedArticlesByEditor(editor.id, 20).catch(() => []);
  const socialLinks = parseEditorSocialLinks(editor.social_links);

  return (
    <main className="content-page editor-profile">
      <div className="editor-profile-head">
        {editor.avatar_url ? (
          <img src={editor.avatar_url} alt="" className="editor-profile-avatar" />
        ) : (
          <span className="editor-profile-avatar editor-profile-avatar-fallback" aria-hidden="true">
            {editor.display_name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <span className="eyebrow">DTECHNURSE EDITOR</span>
          <h1>{editor.display_name}</h1>
          {editor.credentials && <p className="editor-profile-credentials">{editor.credentials}</p>}
        </div>
      </div>

      {editor.bio && <p className="lead">{editor.bio}</p>}

      {socialLinks.length > 0 && (
        <div className="footer-social editor-profile-social" aria-label={`${editor.display_name} on social media`}>
          {socialLinks.map(social => (
            <a key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.platform}>
              <SocialIcon platform={social.platform} />
            </a>
          ))}
        </div>
      )}

      <section className="home-articles" aria-label={`Articles by ${editor.display_name}`}>
        <div className="home-articles-head">
          <div>
            <h2>Articles by {editor.display_name}</h2>
          </div>
        </div>
        {articles.length === 0 ? (
          <div className="notice-card">
            <strong>No published articles yet.</strong>
          </div>
        ) : (
          <div className="home-articles-grid">
            {articles.map(article => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="home-article-card">
                {article.featured_media_url ? (
                  <div className="home-article-media home-article-media-image">
                    <img src={article.featured_media_url} alt={article.featured_media_alt || ''} loading="lazy" />
                  </div>
                ) : (
                  <div className="home-article-media" aria-hidden="true">
                    <span>{article.title.slice(0, 1).toUpperCase()}</span>
                  </div>
                )}
                <div className="home-article-body">
                  <h3>{article.title}</h3>
                  {article.excerpt && <p>{article.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
