import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/server/supabase-auth';
import UserResourceDashboard from '@/components/resources/user-resource-dashboard';
export const metadata = { title: 'My downloads | DTECHNURSE' };
export default async function UserDashboardPage() { const supabase = await getSupabaseServerClient(); const { data } = await supabase.auth.getUser(); if (!data.user) redirect(`/login?next=${encodeURIComponent('/dashboard')}`); return <main className="content-page user-dashboard-page"><span className="eyebrow">YOUR DTECHNURSE ACCOUNT</span><h1>My resource library</h1><p className="lead">Find resources you have downloaded before, revisit your purchase history, and download eligible files again.</p><UserResourceDashboard /></main>; }
