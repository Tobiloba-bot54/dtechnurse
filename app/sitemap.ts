// File: DTECHNURSE-SITE-main/app/sitemap.ts
import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.APP_BASE_URL || 'http://localhost:3000'; return ['', '/about', '/blog', '/contact', '/privacy', '/login', '/signup'].map(path => ({ url: `${base}${path}`, lastModified: new Date() })); }
