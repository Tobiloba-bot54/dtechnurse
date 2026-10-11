import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import ResourcePurchaseVerifier from '@/components/resources/resource-purchase-verifier';
export const metadata = { title: 'Verify resource purchase | DTECHNURSE' };
export default async function PurchaseSuccessPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string; resource?: string }> }) {
  const supabase = await getSupabaseServerClient(); const { data } = await supabase.auth.getUser(); if (!data.user) redirect(`/login?next=${encodeURIComponent('/resources/purchase-success')}`);
  const params = await searchParams; return <main className="content-page resource-purchase-page"><ResourcePurchaseVerifier resourceSlug={params.resource ?? ''} reference={params.reference ?? params.trxref ?? ''} /></main>;
}
