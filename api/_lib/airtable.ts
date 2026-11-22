// Read-only Airtable client for the serverless functions. Uses AIRTABLE_TOKEN_READ only.
//
// Unlike the seed, it never waits 30 s after a 429: a user is waiting for the answer,
// so it fails fast with a clear message. Requests that start together are spaced
// 250 ms apart to stay under 5 requests per second per base.

export const API_URL = 'https://api.airtable.com/v0';
export const MIN_INTERVAL_MS = 250;
export const SERVER_ERROR_RETRY_MS = 500;
const PAGE_SIZE = '100';

export type RawFields = Record<string, unknown>;

export interface RawRecord {
  id: string;
  fields: RawFields;
}

export interface ReaderDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const defaultDeps: ReaderDeps = {
  fetch: (...args) => globalThis.fetch(...args),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

export class AirtableReadError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AirtableReadError';
  }
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

export class AirtableReader {
  private nextSlotAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly baseId: string,
    private readonly token: string,
    private readonly deps: ReaderDeps = defaultDeps,
  ) {}

  /** Every record of the table, with only the given fields (all fields when the list is empty). */
  async listRecords(table: string, fields: readonly string[]): Promise<RawRecord[]> {
    const records: RawRecord[] = [];
    let offset: string | undefined;
    do {
      const query = new URLSearchParams({ pageSize: PAGE_SIZE });
      for (const field of fields) query.append('fields[]', field);
      if (offset) query.set('offset', offset);
      const page = await this.get<{ records: RawRecord[]; offset?: string }>(table, query);
      records.push(...page.records);
      offset = page.offset;
    } while (offset);
    return records;
  }

  /** Reserves the next free slot synchronously, so concurrent callers queue in call order. */
  private async waitForSlot(): Promise<void> {
    const now = this.deps.now();
    const slot = Math.max(now, this.nextSlotAt);
    this.nextSlotAt = slot + MIN_INTERVAL_MS;
    if (slot > now) await this.deps.sleep(slot - now);
  }

  private async get<T>(table: string, query: URLSearchParams): Promise<T> {
    const url = `${API_URL}/${this.baseId}/${encodeURIComponent(table)}?${query}`;
    for (let attempt = 0; ; attempt++) {
      await this.waitForSlot();
      const response = await this.deps.fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
      if (response.ok) return (await response.json()) as T;

      if (response.status === 429) {
        throw new AirtableReadError(429, 'Airtable está limitando las peticiones. Vuelve a intentarlo en 30 segundos.');
      }
      if (response.status >= 500 && attempt === 0) {
        await this.deps.sleep(SERVER_ERROR_RETRY_MS);
        continue;
      }
      const detail = await readErrorDetail(response);
      throw new AirtableReadError(
        response.status,
        `No se pudo leer la tabla ${table} (${response.status}): ${detail}. Revisa docs/campos-calculados.md.`,
      );
    }
  }
}
