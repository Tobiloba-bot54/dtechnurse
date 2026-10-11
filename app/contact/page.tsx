// File: DTECHNURSE-SITE-main/app/contact/page.tsx
import ContactForm from '@/components/contact-form';
import { getEditablePage } from '@/lib/services/content';

export async function generateMetadata() {
  const page = await getEditablePage('contact');
  return { title: page?.title || 'Contact DTECHNURSE', description: 'Contact DTECHNURSE for questions, feedback and collaboration.' };
}

export default async function ContactPage() {
  const page = await getEditablePage('contact');
  return (
    <main className="content-page">
      <span className="eyebrow">GET IN TOUCH</span>
      <h1>{page?.title || 'Contact DTECHNURSE'}</h1>
      {page ? (
        <div className="lead" dangerouslySetInnerHTML={{ __html: page.bodyHtml }} />
      ) : (
        <p className="lead">Have a question, feedback or collaboration idea? Send us a message using the form below.</p>
      )}
      <ContactForm />
    </main>
  );
}
