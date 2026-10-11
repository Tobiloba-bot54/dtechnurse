// File: DTECHNURSE-SITE-main/lib/services/content.ts
import { cache } from 'react';
import { getDatabase } from '@/lib/server/db';
import type { PublicPage } from './types';
export type PublicArticle = { id: string; slug: string; title: string; excerpt: string; published_at: string | null; featured_media_id: string | null; featured_media_url: string | null; featured_media_alt: string | null; categories?: string | null };
export async function listPublishedArticles(limit = 20): Promise<PublicArticle[]> {
  const db = getDatabase(); if (!db) return [];
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const result = await db
    .prepare(
      "SELECT a.id, a.slug, a.title, a.excerpt, a.published_at, a.featured_media_id, m.public_url AS featured_media_url, m.alt_text AS featured_media_alt, (SELECT group_concat(c.name, '||') FROM article_category_links acl JOIN article_categories c ON c.id = acl.category_id WHERE acl.article_id = a.id) AS categories FROM articles a LEFT JOIN media_assets m ON m.id = a.featured_media_id WHERE a.status = 'published' AND (a.published_at IS NULL OR datetime(a.published_at) <= CURRENT_TIMESTAMP) ORDER BY COALESCE(a.published_at, a.created_at) DESC, a.created_at DESC LIMIT ?"
    )
    .bind(safeLimit)
    .all<PublicArticle>();
  return result.results ?? [];
}
export const getPublishedArticle = cache(async (slug: string) => {
  const db = getDatabase(); if (!db) return null;
  return db
    .prepare(
      "SELECT a.id, a.slug, a.title, a.excerpt, a.body_html, a.published_at, a.updated_at, a.featured_media_id, a.seo_title, a.seo_description, a.canonical_url, e.slug AS editor_slug, e.display_name AS editor_name, e.credentials AS editor_credentials, e.avatar_url AS editor_avatar_url FROM articles a LEFT JOIN editors e ON e.id = a.editor_id AND e.status = 'active' WHERE a.slug = ? AND a.status = 'published' AND (a.published_at IS NULL OR datetime(a.published_at) <= CURRENT_TIMESTAMP) LIMIT 1"
    )
    .bind(slug)
    .first<Record<string, unknown>>();
});

export async function listPublishedArticlesByEditor(editorId: string, limit = 20): Promise<PublicArticle[]> {
  const db = getDatabase(); if (!db) return [];
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const result = await db
    .prepare(
      "SELECT a.id, a.slug, a.title, a.excerpt, a.published_at, a.featured_media_id, m.public_url AS featured_media_url, m.alt_text AS featured_media_alt FROM articles a LEFT JOIN media_assets m ON m.id = a.featured_media_id WHERE a.status = 'published' AND a.editor_id = ? AND (a.published_at IS NULL OR datetime(a.published_at) <= CURRENT_TIMESTAMP) ORDER BY a.published_at DESC, a.created_at DESC LIMIT ?"
    )
    .bind(editorId, safeLimit)
    .all<PublicArticle>();
  return result.results ?? [];
}

export type SitemapArticle = { slug: string; published_at: string | null; updated_at: string };
export async function listAllPublishedArticles(limit = 1000): Promise<SitemapArticle[]> {
  const db = getDatabase(); if (!db) return [];
  const result = await db
    .prepare(
      "SELECT slug, published_at, updated_at FROM articles WHERE status = 'published' AND (published_at IS NULL OR datetime(published_at) <= CURRENT_TIMESTAMP) ORDER BY published_at DESC LIMIT ?"
    )
    .bind(limit)
    .all<SitemapArticle>();
  return result.results ?? [];
}

export type SitemapEditor = { slug: string; updated_at: string };
export async function listActiveEditors(limit = 200): Promise<SitemapEditor[]> {
  const db = getDatabase(); if (!db) return [];
  const result = await db
    .prepare("SELECT slug, updated_at FROM editors WHERE status = 'active' ORDER BY updated_at DESC LIMIT ?")
    .bind(limit)
    .all<SitemapEditor>();
  return result.results ?? [];
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


export async function listRelatedArticles(articleId: string, limit = 3): Promise<PublicArticle[]> {
  const db = getDatabase(); if (!db) return [];
  const safeLimit = Math.min(6, Math.max(1, Math.floor(limit)));
  const result = await db.prepare(
    "SELECT DISTINCT a.id, a.slug, a.title, a.excerpt, a.published_at, a.featured_media_id, m.public_url AS featured_media_url, m.alt_text AS featured_media_alt, (SELECT group_concat(c.name, '||') FROM article_category_links acl2 JOIN article_categories c ON c.id = acl2.category_id WHERE acl2.article_id = a.id) AS categories FROM articles a LEFT JOIN media_assets m ON m.id = a.featured_media_id JOIN article_category_links target_link ON target_link.category_id IN (SELECT category_id FROM article_category_links WHERE article_id = ?) AND target_link.article_id = a.id WHERE a.id <> ? AND a.status = 'published' AND (a.published_at IS NULL OR datetime(a.published_at) <= CURRENT_TIMESTAMP) ORDER BY COALESCE(a.published_at, a.created_at) DESC LIMIT ?"
  ).bind(articleId, articleId, safeLimit).all<PublicArticle>();
  return result.results ?? [];
}
