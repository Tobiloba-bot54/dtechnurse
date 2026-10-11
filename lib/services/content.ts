// File: DTECHNURSE-SITE-main/lib/services/content.ts
import { cache } from 'react';
import { getDatabase } from '@/lib/server/db';
import type { PublicPage } from './types';
export type PublicArticle = { id: string; slug: string; title: string; excerpt: string; published_at: string | null; featured_media_id: string | null; featured_media_url: string | null; featured_media_alt: string | null };
export async function listPublishedArticles(limit = 20): Promise<PublicArticle[]> {
  const db = getDatabase(); if (!db) return [];
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const result = await db
    .prepare(
      "SELECT a.id, a.slug, a.title, a.excerpt, a.published_at, a.featured_media_id, m.public_url AS featured_media_url, m.alt_text AS featured_media_alt FROM articles a LEFT JOIN media_assets m ON m.id = a.featured_media_id WHERE a.status = 'published' AND (a.published_at IS NULL OR a.published_at <= CURRENT_TIMESTAMP) ORDER BY a.published_at DESC, a.created_at DESC LIMIT ?"
    )
    .bind(safeLimit)
    .all<PublicArticle>();
  return result.results ?? [];
}
export async function getPublishedArticle(slug: string) {
  const db = getDatabase(); if (!db) return null;
  return db.prepare("SELECT id, slug, title, excerpt, body_html, published_at, featured_media_id, seo_title, seo_description FROM articles WHERE slug = ? AND status = 'published' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP) LIMIT 1").bind(slug).first<Record<string, unknown>>();
}

// Admin-editable static pages (About, Privacy, Contact, …). Cached per request so a
// page's generateMetadata() and its component body share one DB call.
export const getEditablePage = cache(async (slug: string): Promise<PublicPage | null> => {
  const db = getDatabase(); if (!db) return null;
  const row = await db
    .prepare('SELECT slug, title, body_html, updated_at FROM editable_pages WHERE slug = ? LIMIT 1')
    .bind(slug)
    .first<{ slug: string; title: string; body_html: string; updated_at: string }>();
  if (!row) return null;
  return { slug: row.slug, title: row.title, bodyHtml: row.body_html, updatedAt: row.updated_at };
});
