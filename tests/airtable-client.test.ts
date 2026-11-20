import { beforeEach, describe, expect, it } from 'vitest';
import {
  AirtableClient,
  AirtableError,
  MIN_INTERVAL_MS,
  RATE_LIMIT_WAIT_MS,
  type ClientDeps,
} from '../scripts/seed/airtable-client';

interface Call {
  method: string;
  url: string;
  body: unknown;
}

function fakeAirtable(responses: Array<(call: Call) => Response>) {
  const calls: Call[] = [];
  const sleeps: number[] = [];
  let clock = 0;
  const deps: ClientDeps = {
    fetch: async (input, init) => {
      const call = { method: init?.method ?? 'GET', url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined };
      calls.push(call);
      const respond = responses[calls.length - 1];
      if (!respond) throw new Error(`Unexpected request ${call.method} ${call.url}`);
      return respond(call);
    },
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
  };
  return { client: new AirtableClient('appBASE', 'secret-token', deps), calls, sleeps };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
let createdCount = 0;
const echoIds = (call: Call) =>
  json(200, { records: (call.body as { records: unknown[] }).records.map(() => ({ id: `rec${++createdCount}` })) });

beforeEach(() => {
  createdCount = 0;
});

describe('AirtableClient', () => {
  it('creates records in batches of 10 and returns every id in order', async () => {
    const { client, calls } = fakeAirtable([echoIds, echoIds, echoIds]);
    const records = Array.from({ length: 23 }, (_, index) => ({ Nombre: `Proveedor ${index}` }));

    const ids = await client.createRecords('tblSUPPLIERS', records);

    expect(calls.map((call) => (call.body as { records: unknown[] }).records.length)).toEqual([10, 10, 3]);
    expect(calls.every((call) => call.method === 'POST' && call.url === 'https://api.airtable.com/v0/appBASE/tblSUPPLIERS')).toBe(true);
    expect(calls[0]?.body).toMatchObject({ typecast: false });
    expect((calls[2]?.body as { records: unknown[] }).records[0]).toEqual({ fields: { Nombre: 'Proveedor 20' } });
    expect(ids).toEqual(Array.from({ length: 23 }, (_, index) => `rec${index + 1}`));
  });

  it('keeps at least 250 ms between requests', async () => {
    const { client, sleeps } = fakeAirtable([echoIds, echoIds]);
    await client.createRecords('tbl', Array.from({ length: 11 }, () => ({})));
    expect(sleeps).toEqual([MIN_INTERVAL_MS]);
  });

  it('waits 30 s and retries after a 429', async () => {
    const { client, calls, sleeps } = fakeAirtable([() => json(429, { errors: [] }), echoIds]);
    const ids = await client.createRecords('tbl', [{ Nombre: 'A' }]);
    expect(calls).toHaveLength(2);
    expect(sleeps).toContain(RATE_LIMIT_WAIT_MS);
    expect(ids).toHaveLength(1);
  });

  it('does not retry a write that failed with a server error', async () => {
    const { client, calls } = fakeAirtable([() => json(503, { error: 'SERVICE_UNAVAILABLE' })]);
    await expect(client.createRecords('tbl', [{ Nombre: 'A' }])).rejects.toThrow(
      'Airtable respondió 503 a POST /appBASE/tbl: SERVICE_UNAVAILABLE.',
    );
    expect(calls).toHaveLength(1);
  });

  it('retries a read that failed with a server error', async () => {
    const { client, calls } = fakeAirtable([() => json(502, { error: 'BAD_GATEWAY' }), () => json(200, { tables: [] })]);
    await expect(client.listTables()).resolves.toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it('explains authorization errors without exposing the token', async () => {
    const { client } = fakeAirtable([() => json(403, { error: { type: 'INVALID_PERMISSIONS', message: 'Not allowed' } })]);
    const error = await client.listTables().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AirtableError);
    expect((error as Error).message).toBe(
      'Airtable respondió 403 a GET /meta/bases/appBASE/tables: INVALID_PERMISSIONS: Not allowed. Revisa AIRTABLE_TOKEN_WRITE y sus permisos sobre la base.',
    );
    expect((error as Error).message).not.toContain('secret-token');
  });

  it('follows pagination when listing record ids', async () => {
    const { client, calls } = fakeAirtable([
      () => json(200, { records: [{ id: 'rec1' }, { id: 'rec2' }], offset: 'page2' }),
      () => json(200, { records: [{ id: 'rec3' }] }),
    ]);
    await expect(client.listRecordIds('tbl')).resolves.toEqual(['rec1', 'rec2', 'rec3']);
    expect(calls[1]?.url).toContain('offset=page2');
  });

  it('deletes records in batches of 10', async () => {
    const ok = () => json(200, { records: [] });
    const { client, calls } = fakeAirtable([ok, ok]);
    await client.deleteRecords('tbl', Array.from({ length: 12 }, (_, index) => `rec${index}`));
    expect(calls.map((call) => new URL(call.url).searchParams.getAll('records[]').length)).toEqual([10, 2]);
    expect(calls.every((call) => call.method === 'DELETE')).toBe(true);
  });
});
