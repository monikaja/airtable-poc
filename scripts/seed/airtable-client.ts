import type { FieldSpec } from './tables';

// Minimal Airtable REST client for the seed. Uses table IDs everywhere, keeps
// below 5 requests per second per base, and writes in batches of 10 records.

export const API_URL = 'https://api.airtable.com/v0';
export const MAX_RECORDS_PER_WRITE = 10;
/** 250 ms between requests: 4 per second, under the limit of 5. */
export const MIN_INTERVAL_MS = 250;
/** Airtable asks clients to wait 30 s after a 429. */
export const RATE_LIMIT_WAIT_MS = 30_000;
export const SERVER_ERROR_WAIT_MS = 2_000;
export const MAX_RETRIES = 3;

export type FieldValues = Record<string, unknown>;

export interface ExistingTable {
  id: string;
  name: string;
  fields: { name: string }[];
}

/** What the seed needs from Airtable. Tests provide an in-memory implementation. */
export interface SeedClient {
  listTables(): Promise<ExistingTable[]>;
  createTable(name: string, fields: FieldSpec[]): Promise<ExistingTable>;
  hasRecords(tableId: string): Promise<boolean>;
  listRecordIds(tableId: string): Promise<string[]>;
  deleteRecords(tableId: string, recordIds: string[]): Promise<void>;
  /** Creates the records in order and returns their IDs in the same order. */
  createRecords(tableId: string, records: FieldValues[]): Promise<string[]>;
}

export interface ClientDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const defaultDeps: ClientDeps = {
  fetch: (...args) => globalThis.fetch(...args),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

export class AirtableError extends Error {
  constructor(
    readonly status: number,
    readonly method: string,
    readonly path: string,
    detail: string,
  ) {
    const hint = status === 401 || status === 403 ? ' Revisa AIRTABLE_TOKEN_WRITE y sus permisos sobre la base.' : '';
    super(`Airtable respondió ${status} a ${method} ${path}: ${detail}.${hint}`);
    this.name = 'AirtableError';
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) chunks.push(items.slice(start, start + size));
  return chunks;
}

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string | { type?: string; message?: string } };
    if (typeof body.error === 'string') return body.error;
    return [body.error?.type, body.error?.message].filter(Boolean).join(': ') || response.statusText;
  } catch {
    return response.statusText;
  }
}

export class AirtableClient implements SeedClient {
  private lastRequestAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly baseId: string,
    private readonly token: string,
    private readonly deps: ClientDeps = defaultDeps,
  ) {}

  async listTables(): Promise<ExistingTable[]> {
    const body = await this.request<{ tables: ExistingTable[] }>('GET', `/meta/bases/${this.baseId}/tables`);
    return body.tables;
  }

  async createTable(name: string, fields: FieldSpec[]): Promise<ExistingTable> {
    return this.request<ExistingTable>('POST', `/meta/bases/${this.baseId}/tables`, { name, fields });
  }

  async hasRecords(tableId: string): Promise<boolean> {
    const body = await this.request<{ records: unknown[] }>('GET', `/${this.baseId}/${tableId}?maxRecords=1&pageSize=1`);
    return body.records.length > 0;
  }

  async listRecordIds(tableId: string): Promise<string[]> {
    const ids: string[] = [];
    let offset: string | undefined;
    do {
      const query = new URLSearchParams({ pageSize: '100' });
      if (offset) query.set('offset', offset);
      const body = await this.request<{ records: { id: string }[]; offset?: string }>('GET', `/${this.baseId}/${tableId}?${query}`);
      ids.push(...body.records.map((record) => record.id));
      offset = body.offset;
    } while (offset);
    return ids;
  }

  async deleteRecords(tableId: string, recordIds: string[]): Promise<void> {
    for (const batch of chunk(recordIds, MAX_RECORDS_PER_WRITE)) {
      const query = new URLSearchParams(batch.map((id) => ['records[]', id]));
      await this.request('DELETE', `/${this.baseId}/${tableId}?${query}`);
    }
  }

  async createRecords(tableId: string, records: FieldValues[]): Promise<string[]> {
    const ids: string[] = [];
    for (const batch of chunk(records, MAX_RECORDS_PER_WRITE)) {
      // typecast stays off so an unknown select option fails instead of being created silently.
      const body = await this.request<{ records: { id: string }[] }>('POST', `/${this.baseId}/${tableId}`, {
        records: batch.map((fields) => ({ fields })),
        typecast: false,
      });
      ids.push(...body.records.map((record) => record.id));
    }
    return ids;
  }

  private async throttle(): Promise<void> {
    const wait = this.lastRequestAt + MIN_INTERVAL_MS - this.deps.now();
    if (wait > 0) await this.deps.sleep(wait);
    this.lastRequestAt = this.deps.now();
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    // A 429 means the request was not processed, so retrying is always safe. A 5xx on a
    // write may have been applied, so only reads retry on server errors.
    for (let attempt = 0; ; attempt++) {
      await this.throttle();
      const response = await this.deps.fetch(`${API_URL}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.ok) return (await response.json()) as T;

      const rateLimited = response.status === 429;
      const retryableServerError = response.status >= 500 && method === 'GET';
      if ((rateLimited || retryableServerError) && attempt < MAX_RETRIES) {
        await this.deps.sleep(rateLimited ? RATE_LIMIT_WAIT_MS : SERVER_ERROR_WAIT_MS * (attempt + 1));
        continue;
      }
      throw new AirtableError(response.status, method, path, await readErrorDetail(response));
    }
  }
}
