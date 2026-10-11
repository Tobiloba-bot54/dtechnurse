import { cache } from 'react';
import { getDatabase } from '@/lib/server/db';

export type AdminFeatureSettings = { relatedArticles: boolean };
export const defaultAdminFeatureSettings: AdminFeatureSettings = { relatedArticles: true };
const FEATURE_SETTINGS_KEY = 'feature_settings';

export const getAdminFeatureSettings = cache(async (): Promise<AdminFeatureSettings> => {
  const db = getDatabase();
  if (!db) return defaultAdminFeatureSettings;
  try {
    const row = await db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1')
      .bind(FEATURE_SETTINGS_KEY)
      .first<{ setting_value: string }>();
    if (!row?.setting_value) return defaultAdminFeatureSettings;
    const parsed: unknown = JSON.parse(row.setting_value);
    if (!parsed || typeof parsed !== 'object') return defaultAdminFeatureSettings;
    const value = parsed as Record<string, unknown>;
    return { relatedArticles: typeof value.relatedArticles === 'boolean' ? value.relatedArticles : true };
  } catch {
    return defaultAdminFeatureSettings;
  }
});

export async function saveAdminFeatureSettings(settings: AdminFeatureSettings): Promise<void> {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const value = JSON.stringify({ relatedArticles: settings.relatedArticles === true });
  await db.prepare("INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP")
    .bind(FEATURE_SETTINGS_KEY, value)
    .run();
}
