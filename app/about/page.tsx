// File: DTECHNURSE-SITE-main/app/about/page.tsx
import { getEditablePage } from '@/lib/services/content';

export async function generateMetadata() {
  const page = await getEditablePage('about');
  return { title: page?.title || 'About DTECHNURSE' };
}

export default async function AboutPage() {
  const page = await getEditablePage('about');
  if (page) {
    return (
      <main className="content-page">
        <span className="eyebrow">ABOUT US</span>
        <h1>{page.title}</h1>
        <section className="prose" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
      </main>
    );
  }
  return (
    <main className="content-page">
      <span className="eyebrow">ABOUT US</span>
      <h1>Health. Technology. Impact.</h1>
      <p className="lead">DTECHNURSE is a healthcare and technology-focused platform built to connect clinical knowledge with digital innovation.</p>
      <section className="prose">
        <h2>Our purpose</h2>
        <p>We aim to make useful nursing, healthcare technology and professional learning resources easier to discover and understand.</p>
        <h2>Our approach</h2>
        <p>We value clear explanations, responsible use of technology and practical learning that supports professional growth.</p>
      </section>
    </main>
  );
}
