import { randomUUID } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import { getDatabase } from '@/lib/server/db';

export type ResourceRow = { id: string; title: string; slug: string; body_html: string; excerpt: string; featured_media_id: string | null; featured_media_url?: string | null; featured_media_alt?: string | null; category_id: string | null; category_name?: string | null; category_slug?: string | null; file_type: string; pricing: 'free' | 'paid'; price_kobo: number; status: 'draft' | 'published'; featured_on_homepage: number; download_count: number; drive_link?: string; created_at: string; updated_at: string };
export const sanitizeResourceHtml = (html: string) => sanitizeHtml(html.slice(0, 200000), {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'],
  allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class'], a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'title', 'width', 'height', 'loading'] },
  allowedSchemes: ['http', 'https', 'mailto'],
});
const PUBLIC_FIELDS = "r.id, r.title, r.slug, r.body_html, r.excerpt, r.featured_media_id, m.public_url AS featured_media_url, m.alt_text AS featured_media_alt, r.category_id, c.name AS category_name, c.slug AS category_slug, r.file_type, r.pricing, r.price_kobo, r.status, r.featured_on_homepage, r.download_count, r.created_at, r.updated_at";
export async function listPublicResources(options: { category?: string; query?: string; limit?: number; homepage?: boolean } = {}): Promise<ResourceRow[]> {
  const db = getDatabase(); if (!db) return [];
  const limit = Math.min(60, Math.max(1, Math.floor(options.limit ?? 30)));
  const where = ["r.status = 'published'"];
  const values: unknown[] = [];
  if (options.category) { where.push('c.slug = ?'); values.push(options.category); }
  if (options.query) { where.push('(r.title LIKE ? OR r.excerpt LIKE ? OR r.body_html LIKE ?)'); const q = `%${options.query.slice(0, 100)}%`; values.push(q, q, q); }
  if (options.homepage) where.push('r.featured_on_homepage = 1');
  const result = await db.prepare(`SELECT ${PUBLIC_FIELDS} FROM resources r LEFT JOIN media_assets m ON m.id = r.featured_media_id LEFT JOIN resource_categories c ON c.id = r.category_id WHERE ${where.join(' AND ')} ORDER BY r.featured_on_homepage DESC, r.updated_at DESC LIMIT ?`).bind(...values, limit).all<ResourceRow>();
  return result.results ?? [];
}
export async function getPublicResource(slug: string): Promise<ResourceRow | null> {
  const db = getDatabase(); if (!db) return null;
  return db.prepare(`SELECT ${PUBLIC_FIELDS} FROM resources r LEFT JOIN media_assets m ON m.id = r.featured_media_id LEFT JOIN resource_categories c ON c.id = r.category_id WHERE r.slug = ? AND r.status = 'published' LIMIT 1`).bind(slug).first<ResourceRow>();
}
export async function listResourceCategories(): Promise<Array<{ id: string; name: string; slug: string; description: string }>> {
  const db = getDatabase(); if (!db) return [];
  const rows = await db.prepare('SELECT id, name, slug, description FROM resource_categories ORDER BY name').all<{ id: string; name: string; slug: string; description: string }>();
  return rows.results ?? [];
}
export async function listAdminResources(): Promise<ResourceRow[]> {
  const db = getDatabase(); if (!db) return [];
  const rows = await db.prepare(`SELECT ${PUBLIC_FIELDS}, r.drive_link, (SELECT COUNT(*) FROM resource_purchases p WHERE p.resource_id = r.id AND p.status = 'confirmed') AS purchase_count FROM resources r LEFT JOIN media_assets m ON m.id = r.featured_media_id LEFT JOIN resource_categories c ON c.id = r.category_id ORDER BY r.updated_at DESC LIMIT 200`).all<ResourceRow & { purchase_count: number }>();
  return rows.results ?? [];
}
export async function saveResource(input: Record<string, unknown>, id?: string): Promise<{ id: string; slug: string }> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  const title = String(input.title ?? '').trim().slice(0, 180);
  const slug = String(input.slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
  const excerpt = String(input.excerpt ?? '').trim().slice(0, 800);
  const bodyHtml = sanitizeResourceHtml(typeof input.bodyHtml === 'string' ? input.bodyHtml : '');
  const driveLink = String(input.driveLink ?? '').trim().slice(0, 2000);
  const fileType = String(input.fileType ?? 'PDF').trim().slice(0, 40) || 'PDF';
  const pricing = input.pricing === 'paid' ? 'paid' : 'free';
  const priceKobo = pricing === 'paid' ? Math.max(0, Math.floor(Number(input.priceKobo) || 0)) : 0;
  const status = input.status === 'published' ? 'published' : 'draft';
  const featured = input.featuredOnHomepage === true || input.featuredOnHomepage === 1 ? 1 : 0;
  const mediaId = String(input.featuredMediaId ?? '').trim() || null;
  const categoryId = String(input.categoryId ?? '').trim() || null;
  if (!title || !slug || !driveLink) throw new Error('Title, slug, and Google Drive link are required.');
  let parsed: URL;
  try { parsed = new URL(driveLink); } catch { throw new Error('Enter a valid Google Drive URL.'); }
  if (parsed.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(parsed.hostname)) throw new Error('The downloadable file must use a Google Drive URL.');
  if (pricing === 'paid' && priceKobo < 100) throw new Error('Paid resources must have a price of at least ₦1.');
  const resourceId = id ?? randomUUID();
  if (id) {
    await db.prepare("UPDATE resources SET title=?, slug=?, body_html=?, excerpt=?, featured_media_id=?, category_id=?, file_type=?, pricing=?, price_kobo=?, drive_link=?, status=?, featured_on_homepage=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(title, slug, bodyHtml, excerpt, mediaId, categoryId, fileType, pricing, priceKobo, driveLink, status, featured, resourceId).run();
  } else {
    await db.prepare("INSERT INTO resources (id,title,slug,body_html,excerpt,featured_media_id,category_id,file_type,pricing,price_kobo,drive_link,status,featured_on_homepage) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(resourceId, title, slug, bodyHtml, excerpt, mediaId, categoryId, fileType, pricing, priceKobo, driveLink, status, featured).run();
  }
  return { id: resourceId, slug };
}
export async function deleteResource(id: string): Promise<void> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  await db.prepare('DELETE FROM resources WHERE id = ?').bind(id).run();
}
export async function recordResourceDownload(resourceId: string, userId: string): Promise<void> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  const statements = [
    db.prepare('INSERT INTO resource_downloads (id, resource_id, user_id) VALUES (?, ?, ?)').bind(randomUUID(), resourceId, userId),
    db.prepare('UPDATE resources SET download_count = download_count + 1 WHERE id = ?').bind(resourceId),
  ];
  if (db.batch) await db.batch(statements); else { await statements[0].run(); await statements[1].run(); }
}

export async function listAllPublishedResources(limit = 1000): Promise<Array<{ slug: string; updated_at: string }>> {
  const db = getDatabase(); if (!db) return [];
  const rows = await db.prepare("SELECT slug, updated_at FROM resources WHERE status = 'published' ORDER BY updated_at DESC LIMIT ?").bind(Math.min(2000, Math.max(1, limit))).all<{ slug: string; updated_at: string }>();
  return rows.results ?? [];
}

export type ResourcePurchasePreparation =
  | { kind: 'not-found' }
  | { kind: 'not-paid' }
  | { kind: 'already-purchased'; slug: string }
  | { kind: 'pending'; id: string; resourceId: string; title: string; priceKobo: number; reference: string };

export async function prepareResourcePurchase(slug: string, userId: string): Promise<ResourcePurchasePreparation> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  const resource = await db.prepare("SELECT id, title, pricing, price_kobo, status FROM resources WHERE slug = ? LIMIT 1").bind(slug).first<{ id: string; title: string; pricing: string; price_kobo: number; status: string }>();
  if (!resource || resource.status !== 'published') return { kind: 'not-found' };
  if (resource.pricing !== 'paid' || resource.price_kobo < 100) return { kind: 'not-paid' };
  const owned = await db.prepare("SELECT id FROM resource_purchases WHERE resource_id = ? AND user_id = ? AND status = 'confirmed' LIMIT 1").bind(resource.id, userId).first<{ id: string }>();
  if (owned) return { kind: 'already-purchased', slug };
  const reference = `dtn_${randomUUID().replace(/-/g, '')}`;
  const id = randomUUID();
  await db.prepare("INSERT INTO resource_purchases (id, resource_id, user_id, paystack_reference, amount_kobo, status) VALUES (?, ?, ?, ?, ?, 'pending')").bind(id, resource.id, userId, reference, resource.price_kobo).run();
  return { kind: 'pending', id, resourceId: resource.id, title: resource.title, priceKobo: resource.price_kobo, reference };
}

export async function failResourcePurchase(reference: string): Promise<void> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  await db.prepare("UPDATE resource_purchases SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE paystack_reference = ? AND status = 'pending'").bind(reference).run();
}

export async function getResourcePurchaseForVerification(reference: string, userId: string, slug: string) {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  return db.prepare("SELECT p.id, p.resource_id, p.user_id, p.amount_kobo, p.status, r.slug FROM resource_purchases p JOIN resources r ON r.id = p.resource_id WHERE p.paystack_reference = ? AND p.user_id = ? AND r.slug = ? LIMIT 1").bind(reference, userId, slug).first<{ id: string; resource_id: string; user_id: string; amount_kobo: number; status: string; slug: string }>();
}

export async function markResourcePurchaseFailed(id: string): Promise<void> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  await db.prepare("UPDATE resource_purchases SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(id).run();
}

export async function confirmResourcePurchase(id: string): Promise<void> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  await db.prepare("UPDATE resource_purchases SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'").bind(id).run();
}

export async function getAuthorizedResourceDownload(slug: string, userId: string): Promise<{ kind: 'not-found' | 'purchase-required'; driveLink?: never } | { kind: 'ready'; resourceId: string; driveLink: string }> {
  const db = getDatabase(); if (!db) throw new Error('Database is not configured.');
  const resource = await db.prepare("SELECT id, drive_link, pricing, status FROM resources WHERE slug = ? LIMIT 1").bind(slug).first<{ id: string; drive_link: string; pricing: string; status: string }>();
  if (!resource || resource.status !== 'published') return { kind: 'not-found' };
  if (resource.pricing !== 'free') {
    const purchase = await db.prepare("SELECT id FROM resource_purchases WHERE resource_id = ? AND user_id = ? AND status = 'confirmed' LIMIT 1").bind(resource.id, userId).first<{ id: string }>();
    if (!purchase) return { kind: 'purchase-required' };
  }
  await recordResourceDownload(resource.id, userId);
  return { kind: 'ready', resourceId: resource.id, driveLink: resource.drive_link };
}
