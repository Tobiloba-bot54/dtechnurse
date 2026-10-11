// File: DTECHNURSE-SITE-main/app/terms/page.tsx
import { getEditablePage } from '@/lib/services/content';

export async function generateMetadata() {
  const page = await getEditablePage('terms');
  return { title: page?.title || 'Terms of Service' };
}

export default async function TermsPage() {
  const page = await getEditablePage('terms');
  if (page) {
    return (
      <main className="content-page">
        <span className="eyebrow">TERMS</span>
        <h1>{page.title}</h1>
        <section className="prose" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
      </main>
    );
  }
  return (
    <main className="content-page">
      <span className="eyebrow">TERMS</span>
      <h1>Terms of Service</h1>
      <p className="lead">This terms of service page is a placeholder. It must be reviewed and completed before public launch, covering acceptable use, account responsibilities, content ownership, liability limits and governing law.</p>
    </main>
  );
}
