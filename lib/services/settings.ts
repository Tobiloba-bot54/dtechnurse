// File: DTECHNURSE-SITE-main/lib/services/settings.ts
import type { SiteSettings } from './types';
export const defaultSiteSettings: SiteSettings = {
  siteName: 'DTECHNURSE',
  siteDescription: 'Health, technology and impact.',
  features: { blog: true, comments: false, newsletter: false, search: true, socialSharing: true, pwaInstall: true, registration: true, contactForm: true, relatedArticles: true, darkMode: true, readingList: true, customBackground: true },
  socialLinks: []
};
