import Link from 'next/link';
import { getStoreSettings } from '@/lib/services/store/settings';

export const revalidate = 60;
export const metadata = {
  title: 'Store policies | DTECHNURSE',
  description: 'Shipping, returns, disputes, and refund policies for the DTECHNURSE store, plus how to reach support.',
};

export default async function StorePoliciesPage() {
  const settings = await getStoreSettings().catch(() => null);
  const disputeWindowHours = settings?.disputeWindowHours ?? 24;
  return (
    <main className="content-page">
      <span className="eyebrow">DTECHNURSE STORE</span>
      <h1>Store policies</h1>
      <p className="lead">How we ship, handle returns and disputes, and process refunds. If anything is unclear, our support team is happy to help.</p>

      <section aria-labelledby="shipping-heading">
        <h2 id="shipping-heading">Shipping</h2>
        <p>Delivery fees are based on shipping zones covering Nigerian states. When you check out, we show the exact fee for your state before you pay, so there are no surprises.</p>
        <ul>
          <li>Zones group nearby states and each zone has its own delivery fee.</li>
          <li>Some states, including South West states, can have their own fee that overrides the zone fee.</li>
          <li>Products marked <strong>Free shipping</strong> ship at no delivery cost. Depending on the current store setting, your order may need every item, or only one item, to qualify.</li>
          <li>Orders containing only digital products never carry a delivery fee.</li>
          <li>You can see the delivery fee for your state at checkout before placing the order.</li>
        </ul>
      </section>

      <section aria-labelledby="returns-heading">
        <h2 id="returns-heading">Returns and disputes</h2>
        <p>If something is wrong with your order, you can open a dispute from the order page within <strong>{disputeWindowHours} {disputeWindowHours === 1 ? 'hour' : 'hours'}</strong> of the latest order update. Pick the option that fits your situation:</p>
        <ul>
          <li><strong>Refund:</strong> ask for your money back when an item is damaged, incorrect, or did not arrive as described.</li>
          <li><strong>Exchange:</strong> ask for a replacement when you would like the same or an equivalent item sent again.</li>
        </ul>
        <p>Describe the problem clearly and include any useful details. Our team reviews every dispute and responds through your notifications and email.</p>
      </section>

      <section aria-labelledby="refunds-heading">
        <h2 id="refunds-heading">Refunds</h2>
        <p>Approved refunds are processed manually through the merchant account of the payment provider you paid with, either Paystack or Flutterwave. Refunds are recorded on your order with the amount, provider, and reference so you can track them. Depending on your bank, the money usually arrives within a few business days of the refund being issued.</p>
      </section>

      <section aria-labelledby="support-heading">
        <h2 id="support-heading">Support</h2>
        <p>Questions about an order, a product, or a policy? Reach us any time:</p>
        <ul>
          <li>Use the contact page and we will reply by email.</li>
          {settings?.whatsappChatEnabled && settings.whatsappNumber ? <li>Chat with us on WhatsApp for quick answers about products and orders.</li> : null}
        </ul>
        <p>
          <Link className="button" href="/contact">Contact support</Link>
          <Link className="button secondary" href="/orders">View my orders</Link>
        </p>
      </section>
    </main>
  );
}
