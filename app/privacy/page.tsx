// File: DTECHNURSE-SITE-main/app/privacy/page.tsx
import { getEditablePage } from '@/lib/services/content';

export async function generateMetadata() {
  const page = await getEditablePage('privacy');
  return { title: page?.title || 'Privacy Policy' };
}

export default async function PrivacyPage() {
  const page = await getEditablePage('privacy');
  if (page) {
    return (
      <main className="content-page">
        <span className="eyebrow">YOUR PRIVACY</span>
        <h1>{page.title}</h1>
        <section className="prose" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
      </main>
    );
  }
  return (
    <main className="content-page">
      <span className="eyebrow">YOUR PRIVACY</span>
      <h1>Privacy Policy</h1>
      <p className="lead">This policy page is a placeholder for the approved privacy policy. It must be reviewed and completed before public launch, including details of authentication, cookies, analytics, contact submissions, data retention and user rights.</p>
    </main>
  );
}
