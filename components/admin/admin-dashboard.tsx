// File: DTECHNURSE-SITE-main/components/admin/admin-dashboard.tsx
'use client';
import { useEffect, useState } from 'react';
import ArticleEditor from './article-editor';
import PagesEditor from './pages-editor';
import SocialLinksEditor from './social-links-editor';
import EditorsManager from './editors-manager';
import NewsletterComposer from './newsletter-composer';
import EditorialCalendar from './editorial-calendar';
import ArticleAnalytics from './article-analytics';
import FeatureSettingsEditor from './feature-settings-editor';
import Link from 'next/link';

type Tab = 'articles' | 'calendar' | 'analytics' | 'pages' | 'social' | 'editors' | 'newsletter' | 'settings';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'articles', label: 'Articles' },
  { id: 'calendar', label: 'Editorial calendar' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'pages', label: 'Pages' },
  { id: 'social', label: 'Social links' },
  { id: 'editors', label: 'Editors' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'settings', label: 'Settings' },
];

type Stats = { published: number; drafts: number; scheduled: number; categories: number; revisions: number };
export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('articles');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState('');
  useEffect(() => {
    let active = true;
    fetch('/api/admin/stats', { cache: 'no-store' }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Dashboard statistics unavailable.');
      if (active) setStats(data);
    }).catch(error => { if (active) setStatsError(error instanceof Error ? error.message : 'Dashboard statistics unavailable.'); });
    return () => { active = false; };
  }, []);
  return (
    <>
      <section className="admin-stat-grid" aria-label="Content statistics">
        {stats ? <>
          <div className="admin-stat-card"><span>Published articles</span><strong>{stats.published}</strong></div>
          <div className="admin-stat-card"><span>Drafts</span><strong>{stats.drafts}</strong></div>
          <div className="admin-stat-card"><span>Scheduled</span><strong>{stats.scheduled}</strong></div>
          <div className="admin-stat-card"><span>Categories</span><strong>{stats.categories}</strong></div>
          <div className="admin-stat-card"><span>Saved revisions</span><strong>{stats.revisions}</strong></div>
        </> : <p className="admin-muted">{statsError || 'Loading live content statistics…'}</p>}
      </section>
      <div className="admin-dashboard-quick-links"><Link className="button secondary" href="/admin/resources">Manage resources</Link></div>
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
      {tab === 'calendar' && <EditorialCalendar />}
      {tab === 'analytics' && <ArticleAnalytics />}
      {tab === 'pages' && <PagesEditor />}
      {tab === 'social' && <SocialLinksEditor />}
      {tab === 'editors' && <EditorsManager />}
      {tab === 'newsletter' && <NewsletterComposer />}
      {tab === 'settings' && <FeatureSettingsEditor />}
    </>
  );
}
