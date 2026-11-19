import Link from 'next/link';
import { getStoreSettings } from '@/lib/services/store/settings';
import { StoreBrowser } from '@/components/store/store-browser';
import { RecentlyViewed } from '@/components/store/recently-viewed';
import { WhatsAppChat } from '@/components/store/whatsapp-chat';

export const revalidate = 60;
export const metadata = {
  title: 'Store | DTECHNURSE',
  description: 'Shop nursing kits, scrubs, instruments, devices, and digital products curated for nurses and health professionals, with delivery across Nigeria.',
};

export default async function StorePage() {
  const settings = await getStoreSettings().catch(() => null);
  return (
    <main className="content-page store-shell">
      <section className="store-hero">
        <div className="store-hero-copy">
          <span className="eyebrow">DTECHNURSE STORE</span>
          <h1>Everything a nurse needs, in one store</h1>
          <p className="lead">Carefully selected scrubs, instruments, devices, learning materials, and digital products for nurses and health professionals, delivered across Nigeria.</p>
          <div className="hero-actions">
            <Link className="button" href="#products">Shop all</Link>
            <Link className="button secondary" href="#categories">Browse categories</Link>
          </div>
        </div>
      </section>
      <StoreBrowser />
      <RecentlyViewed mode="rail" />
      <WhatsAppChat enabled={Boolean(settings?.whatsappChatEnabled)} number={settings?.whatsappNumber ?? ''} />
    </main>
  );
}
