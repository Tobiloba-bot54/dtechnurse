// File: DTECHNURSE-SITE-main/app/admin/store/page.tsx
import StoreAdminDashboard from '@/components/admin/store/store-dashboard';

export const metadata = { title: 'Store management | DTECHNURSE' };

export default function AdminStorePage() {
  return (
    <main className="content-page">
      <span className="eyebrow">STORE ADMINISTRATION</span>
      <h1>Store management</h1>
      <p className="lead">Listings, orders, shipping fees, promotions and store settings.</p>
      <StoreAdminDashboard />
    </main>
  );
}
