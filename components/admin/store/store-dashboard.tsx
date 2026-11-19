// File: DTECHNURSE-SITE-main/components/admin/store/store-dashboard.tsx
'use client';
import { useState } from 'react';
import { ListingsManager } from './listings-manager';
import { OrdersManager } from './orders-manager';
import { ShippingManager } from './shipping-manager';
import { PromotionsManager } from './promotions-manager';
import { GiftCardsManager } from './gift-cards-manager';
import { ModerationManager } from './moderation-manager';
import { CategoriesManager } from './categories-manager';
import { AnalyticsManager } from './analytics-manager';
import { SettingsManager } from './settings-manager';

type Tab = 'listings' | 'orders' | 'shipping' | 'promotions' | 'giftcards' | 'moderation' | 'categories' | 'analytics' | 'settings';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'listings', label: 'Listings' },
  { id: 'orders', label: 'Orders' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'giftcards', label: 'Gift cards' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'categories', label: 'Categories' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

export default function StoreAdminDashboard() {
  const [tab, setTab] = useState<Tab>('listings');
  return (
    <div className="store-admin">
      <div className="admin-tabs" role="tablist" aria-label="Store admin sections">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'listings' && <ListingsManager />}
      {tab === 'orders' && <OrdersManager />}
      {tab === 'shipping' && <ShippingManager />}
      {tab === 'promotions' && <PromotionsManager />}
      {tab === 'giftcards' && <GiftCardsManager />}
      {tab === 'moderation' && <ModerationManager />}
      {tab === 'categories' && <CategoriesManager />}
      {tab === 'analytics' && <AnalyticsManager />}
      {tab === 'settings' && <SettingsManager />}
    </div>
  );
}
