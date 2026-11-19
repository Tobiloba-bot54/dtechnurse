import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { listAddresses, listZonesWithLocations } from '@/lib/services/store/shipping';
import { CheckoutView } from '@/components/store/checkout-view';

export const metadata = {
  title: 'Checkout | DTECHNURSE',
  description: 'Complete your DTECHNURSE store order: delivery details, shipping fee, and secure payment.',
};

export default async function CheckoutPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/checkout')}`);
  const [addresses, zones] = await Promise.all([
    listAddresses(data.user.id).catch(() => []),
    listZonesWithLocations().catch(() => []),
  ]);
  const states = Array.from(new Set(zones.flatMap(zone => zone.locations.filter(location => location.isActive).map(location => location.name)))).sort();
  const defaultAddress = addresses.find(address => address.isDefault) ?? addresses[0] ?? null;
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">DTECHNURSE STORE</span>
      <h1>Checkout</h1>
      <p className="lead">Confirm your delivery details, see the exact delivery fee for your state, and pay securely.</p>
      <CheckoutView initialAddress={defaultAddress} states={states} />
    </main>
  );
}
