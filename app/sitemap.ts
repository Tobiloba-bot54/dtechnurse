// File: DTECHNURSE-SITE-main/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { listAllPublishedArticles, listActiveEditors } from '@/lib/services/content';
import { listAllPublishedResources } from '@/lib/services/resources';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  const staticEntries: MetadataRoute.Sitemap = ['', '/about', '/blog', '/resources', '/contact', '/privacy'].map(path => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  const [articles, editors, resources] = await Promise.all([listAllPublishedArticles(), listActiveEditors(), listAllPublishedResources()]);

  const articleEntries: MetadataRoute.Sitemap = articles.map(a => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: new Date(a.updated_at || a.published_at || Date.now()),
  }));

  const editorEntries: MetadataRoute.Sitemap = editors.map(e => ({
    url: `${base}/editors/${e.slug}`,
    lastModified: new Date(e.updated_at),
  }));

  const resourceEntries: MetadataRoute.Sitemap = resources.map(resource => ({ url: `${base}/resources/${resource.slug}`, lastModified: new Date(resource.updated_at || Date.now()) }));

  return [...staticEntries, ...articleEntries, ...editorEntries, ...resourceEntries];
}
