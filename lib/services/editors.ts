import { getDatabase } from '@/lib/server/db';

export type SocialLink = { platform: string; url: string };
export type Editor = {
  id: string;
  slug: string;
  display_name: string;
  credentials: string;
  bio: string;
  avatar_url: string | null;
  social_links: string;
  status: 'active' | 'hidden';
  created_at: string;
  updated_at: string;
};

export function parseEditorSocialLinks(raw: string): SocialLink[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(item => ({
        platform: typeof item.platform === 'string' ? item.platform.trim().slice(0, 60) : '',
        url: typeof item.url === 'string' ? item.url.trim().slice(0, 500) : '',
      }))
      .filter(item => item.platform && item.url);
  } catch {
    return [];
  }
}

export async function listEditors(includeHidden = false): Promise<Editor[]> {
  const db = getDatabase();
  if (!db) return [];
  const sql = includeHidden
    ? 'SELECT * FROM editors ORDER BY display_name ASC'
    : "SELECT * FROM editors WHERE status = 'active' ORDER BY display_name ASC";
  const result = await db.prepare(sql).all<Editor>();
  return result.results;
}

export async function getEditorBySlug(slug: string): Promise<Editor | null> {
  const db = getDatabase();
  if (!db) return null;
  return db.prepare('SELECT * FROM editors WHERE slug = ? LIMIT 1').bind(slug).first<Editor>();
}

export async function getEditorById(id: string): Promise<Editor | null> {
  const db = getDatabase();
  if (!db) return null;
  return db.prepare('SELECT * FROM editors WHERE id = ? LIMIT 1').bind(id).first<Editor>();
}
