// File: DTECHNURSE-SITE-main/lib/server/db.ts
// Infrastructure-neutral database contract with a Cloudflare D1 adapter.
export interface SqlStatement { bind(...values: unknown[]): SqlStatement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<unknown> }
export interface SqlDatabase { prepare(sql: string): SqlStatement; batch?(statements: SqlStatement[]): Promise<unknown[]> }
export function getDatabase(): SqlDatabase | null {
  // Cloudflare Workers can expose D1 through a binding. Next.js Node deployments
  // must provide a compatible adapter instead of importing Cloudflare APIs here.
  const runtime = globalThis as typeof globalThis & { env?: { DB?: SqlDatabase }; DB?: SqlDatabase };
  return runtime.env?.DB ?? runtime.DB ?? null;
}
