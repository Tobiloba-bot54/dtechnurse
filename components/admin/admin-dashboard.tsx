// File: DTECHNURSE-SITE-main/components/admin/admin-dashboard.tsx
'use client';
import { useState } from 'react';
import ArticleEditor from './article-editor';
import PagesEditor from './pages-editor';
import SocialLinksEditor from './social-links-editor';

type Tab = 'articles' | 'pages' | 'social';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'articles', label: 'Articles' },
  { id: 'pages', label: 'Pages' },
  { id: 'social', label: 'Social links' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('articles');
  return (
    <>
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
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
      {tab === 'articles' && <ArticleEditor />}
      {tab === 'pages' && <PagesEditor />}
      {tab === 'social' && <SocialLinksEditor />}
    </>
  );
}
