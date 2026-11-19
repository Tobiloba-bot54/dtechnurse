import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import { listAddresses, listZonesWithLocations } from '@/lib/services/store/shipping';
import { AddressManager } from '@/components/store/address-manager';

export const metadata = { title: 'My addresses | DTECHNURSE' };

export default async function AddressesPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent('/account/addresses')}`);
  const [addresses, zones] = await Promise.all([
    listAddresses(data.user.id).catch(() => []),
    listZonesWithLocations().catch(() => []),
  ]);
  const states = Array.from(new Set(zones.flatMap(zone => zone.locations.filter(location => location.isActive).map(location => location.name)))).sort();
  return (
    <main className="content-page store-shell">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>Delivery addresses</h1>
      <p className="lead">Save the addresses you deliver to most often. Your default address is used to speed up checkout.</p>
      <AddressManager initialAddresses={addresses} states={states} />
    </main>
  );
}
