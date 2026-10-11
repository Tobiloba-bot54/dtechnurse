// File: DTECHNURSE-SITE-main/lib/services/content.ts
import { getDatabase } from '@/lib/server/db';
export type PublicArticle = { id: string; slug: string; title: string; excerpt: string; published_at: string | null; featured_media_id: string | null };
export async function listPublishedArticles(limit = 20): Promise<PublicArticle[]> {
  const db = getDatabase(); if (!db) return [];
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const result = await db.prepare("SELECT id, slug, title, excerpt, published_at, featured_media_id FROM articles WHERE status = 'published' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP) ORDER BY published_at DESC, created_at DESC LIMIT ?").bind(safeLimit).all<PublicArticle>();
  return result.results ?? [];
}
export async function getPublishedArticle(slug: string) {
  const db = getDatabase(); if (!db) return null;
  return db.prepare("SELECT id, slug, title, excerpt, body_html, published_at, featured_media_id, seo_title, seo_description FROM articles WHERE slug = ? AND status = 'published' AND (published_at IS NULL OR published_at <= CURRENT_TIMESTAMP) LIMIT 1").bind(slug).first<Record<string, unknown>>();
}
