// File: DTECHNURSE-SITE-main/lib/server/db.ts
// Infrastructure-neutral database contract with a Cloudflare D1 adapter.
export interface SqlStatement { bind(...values: unknown[]): SqlStatement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<unknown> }
export interface SqlDatabase { prepare(sql: string): SqlStatement; batch?(statements: SqlStatement[]): Promise<unknown[]> }

class D1HttpStatement implements SqlStatement {
  private params: unknown[] = [];
  constructor(private sql: string, private accountId: string, private databaseId: string, private apiToken: string) {}
  bind(...values: unknown[]) { this.params = values; return this; }
  private async exec<T>(): Promise<{ results: T[] }> {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: this.sql, params: this.params }),
      }
    );
    const data = await res.json() as { success: boolean; result?: Array<{ results: T[] }>; errors?: Array<{ message: string }> };
    if (!res.ok || !data.success) {
      throw new Error(data.errors?.[0]?.message ?? 'D1 query failed.');
    }
    return { results: data.result?.[0]?.results ?? [] };
  }
  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const { results } = await this.exec<T>();
    return results[0] ?? null;
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> { return this.exec<T>(); }
  async run(): Promise<unknown> { return this.exec(); }
}

class D1HttpDatabase implements SqlDatabase {
  constructor(private accountId: string, private databaseId: string, private apiToken: string) {}
  prepare(sql: string): SqlStatement { return new D1HttpStatement(sql, this.accountId, this.databaseId, this.apiToken); }
}

export function getDatabase(): SqlDatabase | null {
  // Cloudflare Workers can expose D1 through a binding.
  const runtime = globalThis as typeof globalThis & { env?: { DB?: SqlDatabase }; DB?: SqlDatabase };
  const binding = runtime.env?.DB ?? runtime.DB ?? null;
  if (binding) return binding;

  // Vercel (or any Node host) has no binding, so fall back to D1's HTTP API.
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.D1_DATABASE_ID ?? process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (accountId && databaseId && apiToken) {
    return new D1HttpDatabase(accountId, databaseId, apiToken);
  }
  return null;
}
