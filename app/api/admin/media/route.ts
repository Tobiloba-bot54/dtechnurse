// File: DTECHNURSE-SITE-main/app/api/admin/media/route.ts
import { randomUUID } from 'node:crypto';
import { getDatabase } from '@/lib/server/db';
import { getBucket, getPublicMediaBase } from '@/lib/server/storage';
import { requireAdmin } from '@/lib/server/supabase-auth';
import { jsonError } from '@/lib/server/validation';

export const runtime = 'nodejs';
const MAX_BYTES = 8 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const rows = await db.prepare('SELECT id, public_url, mime_type, size_bytes, width, height, alt_text, caption, created_at FROM media_assets ORDER BY created_at DESC LIMIT 200').all();
  return Response.json({ media: rows.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db = getDatabase();
  if (!db) return jsonError('Database is not configured.', 503);
  const bucket = getBucket();
  const publicBase = getPublicMediaBase();
  if (!bucket || !publicBase) return jsonError('R2 media storage is not configured.', 503);
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError('Expected a multipart upload.', 400); }
  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('Choose an image file.', 400);
  const ext = MIME_EXT[file.type];
  if (!ext) return jsonError('Only JPEG, PNG, WebP and GIF images are supported.', 415);
  if (file.size < 1 || file.size > MAX_BYTES) return jsonError('Image must be smaller than 8 MB.', 413);
  const alt = String(form.get('alt') ?? '').trim().slice(0, 300);
  const caption = String(form.get('caption') ?? '').trim().slice(0, 500);
  const id = randomUUID();
  const key = `uploads/${id}.${ext}`;
  const bytes = await file.arrayBuffer();
  try {
    await bucket.put(key, bytes, { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
    const url = `${publicBase.replace(/\/$/, '')}/${key}`;
    await db.prepare('INSERT INTO media_assets (id, object_key, public_url, mime_type, size_bytes, alt_text, caption, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, key, url, file.type, file.size, alt, caption, auth.user.id).run();
    return Response.json({ id, url, alt, caption, mimeType: file.type, sizeBytes: file.size }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Upload could not be completed. Verify R2 and D1 configuration.', 500);
  }
}
