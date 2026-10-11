// File: DTECHNURSE-SITE-main/app/page.tsx
import Link from 'next/link';
import { listPublishedArticles } from '@/lib/services/content';

export const revalidate = 60;

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function HomePage() {
  const articles = await listPublishedArticles(10).catch(() => []);

  return (
    <main className="home-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">HEALTH · TECH · IMPACT</span>
          <h1>The Future of<br />Nursing is <span className="hero-accent">Digital</span></h1>
          <p>Empowering nurses to master healthcare technology, reduce burnout, and advance their careers in the digital age.</p>
          <div className="hero-actions">
            <Link className="button" href="/blog">Explore articles</Link>
            <Link className="button secondary" href="/about">Discover DTECHNURSE</Link>
          </div>
          <div className="trust-row">
            <span>Evidence-aware learning</span>
            <span>Digital health insights</span>
            <span>Professional growth</span>
          </div>
        </div>
      </section>

      <section className="feature-grid" aria-label="Explore DTECHNURSE">
        <article className="feature-card">
          <span className="card-number">01</span>
          <h2>Nursing knowledge</h2>
          <p>Explore clear learning resources for nursing practice and professional development.</p>
          <Link href="/blog">Browse learning content <span aria-hidden="true">→</span></Link>
        </article>
        <article className="feature-card">
          <span className="card-number">02</span>
          <h2>Healthcare technology</h2>
          <p>Understand digital tools, innovation and technology shaping healthcare.</p>
          <Link href="/blog">Read technology insights <span aria-hidden="true">→</span></Link>
        </article>
        <article className="feature-card">
          <span className="card-number">03</span>
          <h2>Impact and growth</h2>
          <p>Find ideas and resources to help turn knowledge into meaningful impact.</p>
          <Link href="/about">Learn about our mission <span aria-hidden="true">→</span></Link>
        </article>
      </section>

      <section className="home-articles" aria-label="Latest articles">
        <div className="home-articles-head">
          <div>
            <span className="eyebrow">FROM THE JOURNAL</span>
            <h2>Latest articles</h2>
          </div>
          <Link className="text-link" href="/blog">View all articles <span aria-hidden="true">→</span></Link>
        </div>

        {articles.length === 0 ? (
          <div className="notice-card">
            <strong>New articles are being prepared.</strong>
            <p>Check back soon for evidence-informed articles and useful resources from DTECHNURSE.</p>
          </div>
        ) : (
          <div className="home-articles-grid">
            {articles.map(article => {
              const dateLabel = formatDate(article.published_at);
              return (
                <article key={article.id} className="home-article-card">
                  <div className="home-article-media" aria-hidden="true">
                    <span>{article.title.slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="home-article-body">
                    <h3>{article.title}</h3>
                    {article.excerpt && <p>{article.excerpt}</p>}
                    {dateLabel && <span className="home-article-date">{dateLabel}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
