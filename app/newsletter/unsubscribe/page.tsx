import type { Metadata } from 'next';
import UnsubscribeForm from '@/components/newsletter-unsubscribe';
export const metadata: Metadata = { title: 'Unsubscribe | DTECHNURSE', robots: { index: false, follow: false } };
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  return <main className="content-page unsubscribe-page"><span className="eyebrow">NEWSLETTER PREFERENCES</span><h1>Manage your subscription</h1><p className="lead">Confirm if you would like to stop receiving DTECHNURSE newsletter emails.</p><UnsubscribeForm token={token} /></main>;
}
