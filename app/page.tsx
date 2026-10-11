// File: DTECHNURSE-SITE-main/app/page.tsx
import Link from 'next/link';
import { listPublishedArticles } from '@/lib/services/content';
import { listPublicResources } from '@/lib/services/resources';
import { getDisplayImage } from '@/lib/media';
import { ScrollReveal } from '@/components/scroll-reveal';
import { NewsletterSignup } from '@/components/newsletter-signup';

export const revalidate = 60;

const TOPIC_TAGS = [
  'General', 'Nursing Fundamentals', 'Digital Health', 'Health Informatics',
  'Artificial Intelligence in Healthcare', 'Patient Monitoring Technology',
  'Electronic Health Records', 'Telehealth', 'Medical Devices',
  'Nursing Research', 'Career Development', 'News',
];

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function HomePage() {
  const [articles, resources] = await Promise.all([listPublishedArticles(20).catch(() => []), listPublicResources({ homepage: true, limit: 3 }).catch(() => [])]);

  return (
    <main className="home-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">HEALTH · TECH · IMPACT</span>
          <h1>Where <span className="hero-accent">Nursing</span> meets the future of healthcare.</h1>
          <p>Practical nursing knowledge, digital health insights, and technology guidance to help healthcare professionals learn, adapt, and make a meaningful impact.</p>
          <div className="hero-actions">
            <Link className="button" href="/blog">Explore articles</Link>
            <Link className="button secondary" href="/blog">Browse by topic</Link>
          </div>
        </div>
      </section>

      <section className="topic-strip" aria-label="Topics covered by DTECHNURSE">
        <div className="topic-strip-track">
          {TOPIC_TAGS.map(tag => <span key={tag} className="topic-pill">{tag}</span>)}
          {TOPIC_TAGS.map(tag => <span key={`${tag}-repeat`} className="topic-pill" aria-hidden="true">{tag}</span>)}
        </div>
      </section>

      <section className="home-intro">
        <span className="eyebrow">LEARN. CONNECT. ADVANCE.</span>
        <h2>Useful knowledge for every step of your digital health journey</h2>
        <p>From nursing fundamentals to artificial intelligence in healthcare, explore topics that connect quality care with practical innovation.</p>
      </section>
      <section className="feature-grid" aria-label="Explore DTECHNURSE">
        <ScrollReveal delay={0}>
          <article className="feature-card">
            <span className="card-number">01</span>
            <h2>Nursing knowledge</h2>
            <p>Explore clear learning resources for nursing practice and professional development.</p>
            <Link href="/blog">Browse learning content <span aria-hidden="true">→</span></Link>
          </article>
        </ScrollReveal>
        <ScrollReveal delay={100}>
          <article className="feature-card">
            <span className="card-number">02</span>
            <h2>Healthcare technology</h2>
            <p>Understand digital tools, innovation and technology shaping healthcare.</p>
            <Link href="/blog">Read technology insights <span aria-hidden="true">→</span></Link>
          </article>
        </ScrollReveal>
        <ScrollReveal delay={200}>
          <article className="feature-card">
            <span className="card-number">03</span>
            <h2>Impact and growth</h2>
            <p>Find ideas and resources to help turn knowledge into meaningful impact.</p>
            <Link href="/about">Learn about our mission <span aria-hidden="true">→</span></Link>
          </article>
        </ScrollReveal>
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
            {articles.map((article, index) => {
              const dateLabel = formatDate(article.published_at);
              return (
                <ScrollReveal key={article.id} delay={(index % 3) * 100}>
                  <Link href={`/blog/${article.slug}`} className="home-article-card">
                    <div className="home-article-media home-article-media-image"><img src={getDisplayImage(article.featured_media_url)} alt={article.featured_media_alt || ''} loading="lazy" /></div>
                    <div className="home-article-body">
                      <h3>{article.title}</h3>
                      {article.excerpt && <p>{article.excerpt}</p>}
                      {dateLabel && <span className="home-article-date">{dateLabel}</span>}
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </section>

      {resources.length > 0 && <section className="home-articles home-resources" aria-label="Featured downloadable resources">
        <div className="home-articles-head"><div><span className="eyebrow">DOWNLOAD CENTRE</span><h2>Featured resources</h2><p>Practical downloads to support your study, clinical work, and professional growth.</p></div><Link className="text-link" href="/resources">Browse all resources <span aria-hidden="true">→</span></Link></div>
        <div className="resource-card-grid">{resources.map(resource => <article className="resource-card" key={resource.id}><Link href={`/resources/${resource.slug}`} className="resource-card-image"><img src={getDisplayImage(resource.featured_media_url)} alt={resource.featured_media_alt || `${resource.title} cover`} loading="lazy" /></Link><div className="resource-card-body"><div className="resource-card-meta"><span>{resource.file_type}</span><span>{resource.pricing === 'paid' ? `₦${(resource.price_kobo / 100).toLocaleString('en-NG')}` : 'Free'}</span></div><h3><Link href={`/resources/${resource.slug}`}>{resource.title}</Link></h3><p>{resource.excerpt}</p><Link className="text-link" href={`/resources/${resource.slug}`}>View resource <span aria-hidden="true">→</span></Link></div></article>)}</div>
      </section>}

      <NewsletterSignup />
    </main>
  );
}
