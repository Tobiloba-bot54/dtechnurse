import { CartView } from '@/components/store/cart-view';

export const metadata = {
  title: 'Your cart | DTECHNURSE',
  description: 'Review the items in your DTECHNURSE store cart, apply a coupon, and check out when you are ready.',
};

export default function CartPage() {
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">DTECHNURSE STORE</span>
      <h1>Your cart</h1>
      <p className="lead">Review your items, adjust quantities, apply a coupon, and check out when you are ready.</p>
      <CartView />
    </main>
  );
}
