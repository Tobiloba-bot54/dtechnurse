// File: DTECHNURSE-SITE-main/lib/services/types.ts
export type PublicPage = { slug: string; title: string; bodyHtml: string; updatedAt: string };
export type Article = { id: string; slug: string; title: string; excerpt: string; bodyHtml: string; publishedAt: string | null; status: 'draft' | 'published'; featuredImageUrl?: string | null };
export type SiteFeature = 'blog' | 'comments' | 'newsletter' | 'search' | 'socialSharing' | 'pwaInstall' | 'registration' | 'contactForm' | 'relatedArticles' | 'darkMode' | 'readingList' | 'customBackground';
export type SiteSettings = { siteName: string; siteDescription: string; features: Record<SiteFeature, boolean>; socialLinks: Array<{ platform: string; url: string; enabled: boolean }> };
