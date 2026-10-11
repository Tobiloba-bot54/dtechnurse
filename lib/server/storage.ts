// File: DTECHNURSE-SITE-main/lib/server/storage.ts
// Infrastructure-neutral object storage contract with a Cloudflare R2 adapter.
import { AwsClient } from 'aws4fetch';

export interface PutOptions { httpMetadata?: { contentType?: string; cacheControl?: string } }
export interface ObjectBucket {
  put(key: string, value: ArrayBuffer, options?: PutOptions): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

class R2HttpBucket implements ObjectBucket {
  private client: AwsClient;
  constructor(private endpoint: string, private bucketName: string, accessKeyId: string, secretAccessKey: string) {
    this.client = new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' });
  }
  private url(key: string) {
    return `${this.endpoint.replace(/\/$/, '')}/${this.bucketName}/${key}`;
  }
  async put(key: string, value: ArrayBuffer, options?: PutOptions): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (options?.httpMetadata?.contentType) headers['Content-Type'] = options.httpMetadata.contentType;
    if (options?.httpMetadata?.cacheControl) headers['Cache-Control'] = options.httpMetadata.cacheControl;
    const res = await this.client.fetch(this.url(key), { method: 'PUT', body: value, headers });
    if (!res.ok) throw new Error(`R2 put failed with status ${res.status}`);
    return res;
  }
  async delete(key: string): Promise<unknown> {
    const res = await this.client.fetch(this.url(key), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed with status ${res.status}`);
    return res;
  }
}

export function getBucket(): ObjectBucket | null {
  // Cloudflare Workers can expose R2 through a binding.
  const runtime = globalThis as typeof globalThis & { env?: { MEDIA?: ObjectBucket }; MEDIA?: ObjectBucket };
  const binding = runtime.env?.MEDIA ?? runtime.MEDIA ?? null;
  if (binding) return binding;

  // Vercel (or any Node host) has no binding, so fall back to R2's S3-compatible API.
  const endpoint = process.env.R2_ENDPOINT;
  const bucketName = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (endpoint && bucketName && accessKeyId && secretAccessKey) {
    return new R2HttpBucket(endpoint, bucketName, accessKeyId, secretAccessKey);
  }
  return null;
}

export function getPublicMediaBase(): string | null {
  const runtime = globalThis as typeof globalThis & { env?: { MEDIA_PUBLIC_URL?: string }; MEDIA_PUBLIC_URL?: string };
  return runtime.env?.MEDIA_PUBLIC_URL ?? runtime.MEDIA_PUBLIC_URL ?? process.env.R2_PUBLIC_BASE_URL ?? null;
}
