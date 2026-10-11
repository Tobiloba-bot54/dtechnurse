import { getDatabase } from '@/lib/server/db';

export async function getUserResourceLibrary(userId: string) {
  const db = getDatabase();
  if (!db) throw new Error('Database is not configured.');
  const downloads = await db.prepare("SELECT d.id, d.downloaded_at, r.title, r.slug, r.file_type, r.pricing, r.excerpt, r.featured_media_id, m.public_url AS featured_media_url FROM resource_downloads d JOIN resources r ON r.id = d.resource_id LEFT JOIN media_assets m ON m.id = r.featured_media_id WHERE d.user_id = ? AND r.status = 'published' ORDER BY d.downloaded_at DESC LIMIT 500").bind(userId).all<Record<string, unknown>>();
  const purchases = await db.prepare("SELECT p.id, p.status, p.confirmed_at, p.created_at, r.title, r.slug, r.file_type, r.price_kobo FROM resource_purchases p JOIN resources r ON r.id = p.resource_id WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 200").bind(userId).all<Record<string, unknown>>();
  return { downloads: downloads.results ?? [], purchases: purchases.results ?? [] };
}
