// File: DTECHNURSE-SITE-main/lib/services/site-settings.ts
import { getDatabase } from '@/lib/server/db';

export type SocialLink = { platform: string; url: string; enabled: boolean };

const SOCIAL_LINKS_KEY = 'social_links';

export const defaultSocialLinks: SocialLink[] = [
  { platform: 'Twitter', url: 'https://twitter.com/dtechnurse', enabled: true },
  { platform: 'LinkedIn', url: 'https://www.linkedin.com/company/dtechnurse', enabled: true },
  { platform: 'Facebook', url: 'https://www.facebook.com/dtechnurse', enabled: true },
  { platform: 'Instagram', url: 'https://www.instagram.com/dtechnurse', enabled: true },
];

function parseSocialLinks(raw: unknown): SocialLink[] | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((item): item is Record<string, unknown> => item && typeof item === 'object')
      .map(item => ({
        platform: typeof item.platform === 'string' ? item.platform.trim().slice(0, 60) : '',
        url: typeof item.url === 'string' ? item.url.trim().slice(0, 500) : '',
        enabled: item.enabled !== false,
      }))
      .filter(item => item.platform && item.url);
  } catch {
    return null;
  }
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  const db = getDatabase();
  if (!db) return defaultSocialLinks;
  const row = await db
    .prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1')
    .bind(SOCIAL_LINKS_KEY)
    .first<{ setting_value: string }>();
  if (!row) return defaultSocialLinks;
  const parsed = parseSocialLinks(row.setting_value);
  return parsed ?? defaultSocialLinks;
}

export async function saveSocialLinks(links: SocialLink[]): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const clean = links
    .map(link => ({
      platform: link.platform.trim().slice(0, 60),
      url: link.url.trim().slice(0, 500),
      enabled: link.enabled !== false,
    }))
    .filter(link => link.platform && /^https?:\/\//i.test(link.url))
    .slice(0, 20);
  const value = JSON.stringify(clean);
  await db
    .prepare(
      "INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(SOCIAL_LINKS_KEY, value)
    .run();
}
