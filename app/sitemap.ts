// File: DTECHNURSE-SITE-main/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { listAllPublishedArticles, listActiveEditors } from '@/lib/services/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  const staticEntries: MetadataRoute.Sitemap = ['', '/about', '/blog', '/contact', '/privacy'].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const [articles, editors] = await Promise.all([listAllPublishedArticles(), listActiveEditors()]);

  const articleEntries: MetadataRoute.Sitemap = articles.map(a => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: new Date(a.updated_at || a.published_at || Date.now()),
  }));

  const editorEntries: MetadataRoute.Sitemap = editors.map(e => ({
    url: `${base}/editors/${e.slug}`,
    lastModified: new Date(e.updated_at),
  }));

  return [...staticEntries, ...articleEntries, ...editorEntries];
}
