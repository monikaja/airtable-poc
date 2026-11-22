import { describe, expect, it } from 'vitest';
import { AirtableReader, AirtableReadError, MIN_INTERVAL_MS, type ReaderDeps } from '../api/_lib/airtable';
import { createCache } from '../api/_lib/cache';
import { mapSnapshot, type RawTables } from '../api/_lib/snapshot';

function fakeReader(responses: Array<() => Response>) {
  const urls: string[] = [];
  const sleeps: number[] = [];
  // The clock stays frozen: every request starts at t=0, so waits show the reserved slots.
  const deps: ReaderDeps = {
    fetch: async (input) => {
      urls.push(String(input));
      const respond = responses[urls.length - 1];
      if (!respond) throw new Error(`Unexpected request ${String(input)}`);
      return respond();
    },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    now: () => 0,
  };
  return { reader: new AirtableReader('appBASE', 'read-token', deps), urls, sleeps };
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe('AirtableReader', () => {
  it('reads every page of a table, asking only for the given fields', async () => {
    const { reader, urls } = fakeReader([
      () => json(200, { records: [{ id: 'rec1', fields: { Nombre: 'A' } }], offset: 'next' }),
      () => json(200, { records: [{ id: 'rec2', fields: { Nombre: 'B' } }] }),
    ]);

    const records = await reader.listRecords('Avíos', ['Referencia', 'Tipo']);

    expect(records).toEqual([
      { id: 'rec1', fields: { Nombre: 'A' } },
      { id: 'rec2', fields: { Nombre: 'B' } },
    ]);
    const first = new URL(urls[0] ?? '');
    expect(first.pathname).toBe('/v0/appBASE/Av%C3%ADos');
    expect(first.searchParams.getAll('fields[]')).toEqual(['Referencia', 'Tipo']);
    expect(new URL(urls[1] ?? '').searchParams.get('offset')).toBe('next');
  });

  it('spaces requests at least 250 ms apart, even when started together', async () => {
    const ok = () => json(200, { records: [] });
    const { reader, sleeps } = fakeReader([ok, ok, ok]);
    await Promise.all([reader.listRecords('A', []), reader.listRecords('B', []), reader.listRecords('C', [])]);
    expect(sleeps).toEqual([MIN_INTERVAL_MS, 2 * MIN_INTERVAL_MS]);
  });

  it('retries a server error once', async () => {
    const { reader, urls } = fakeReader([() => json(502, { error: 'BAD_GATEWAY' }), () => json(200, { records: [] })]);
    await expect(reader.listRecords('A', [])).resolves.toEqual([]);
    expect(urls).toHaveLength(2);
  });

  it('fails fast on 429 with a message for the user', async () => {
    const { reader, urls } = fakeReader([() => json(429, {})]);
    await expect(reader.listRecords('A', [])).rejects.toThrow(
      'Airtable está limitando las peticiones. Vuelve a intentarlo en 30 segundos.',
    );
    expect(urls).toHaveLength(1);
  });

  it('names the table and the Airtable error when a field is missing', async () => {
    const { reader } = fakeReader([
      () => json(422, { error: { type: 'UNKNOWN_FIELD_NAME', message: 'Unknown field name: "Riesgo"' } }),
    ]);
    const error = await reader.listRecords('Prendas', ['Riesgo']).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AirtableReadError);
    expect((error as Error).message).toBe(
      'No se pudo leer la tabla Prendas (422): UNKNOWN_FIELD_NAME: Unknown field name: "Riesgo". Revisa docs/campos-calculados.md.',
    );
  });
});

describe('createCache', () => {
  it('reuses the value for 60 s and loads again afterwards', async () => {
    let clock = 0;
    let loads = 0;
    const cache = createCache(60_000, () => clock);
    const load = async () => ++loads;

    expect(await cache.get('k', load)).toBe(1);
    clock = 59_999;
    expect(await cache.get('k', load)).toBe(1);
    clock = 60_000;
    expect(await cache.get('k', load)).toBe(2);
  });

  it('shares one load between concurrent callers', async () => {
    let loads = 0;
    const cache = createCache(60_000, () => 0);
    const load = async () => ++loads;
    await Promise.all([cache.get('k', load), cache.get('k', load)]);
    expect(loads).toBe(1);
  });

  it('does not keep a failed load', async () => {
    const cache = createCache(60_000, () => 0);
    await expect(cache.get('k', async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(cache.get('k', async () => 'ok')).resolves.toBe('ok');
  });
});

describe('mapSnapshot', () => {
  const empty: RawTables = { suppliers: [], fabrics: [], trims: [], garments: [], bom: [], clients: [], catalog: [] };

  it('reads lookups as their first value, links as their first id, and computed fields as-is', () => {
    const snapshot = mapSnapshot({
      ...empty,
      fabrics: [
        {
          id: 'recF',
          fields: {
            Código: 'TJ-007',
            Nombre: 'Sarga 65/35 marino',
            Composición: '65 % poliéster, 35 % algodón',
            'Gramaje g/m²': 245,
            Color: 'Marino',
            'Precio €/m': 4.8,
            Estado: 'Descatalogado',
            Proveedor: ['recP'],
            'Plazo proveedor': [30],
          },
        },
      ],
      garments: [{ id: 'recG', fields: { Nombre: 'Peto', Código: 'PR-003', Fase: 'Producción', 'Coste materiales': 10.48, 'Plazo crítico': 30, Riesgo: 'Rojo' } }],
    });

    expect(snapshot.fabrics[0]).toEqual({
      id: 'recF',
      code: 'TJ-007',
      name: 'Sarga 65/35 marino',
      composition: '65 % poliéster, 35 % algodón',
      weightGsm: 245,
      color: 'Marino',
      pricePerMeter: 4.8,
      status: 'Descatalogado',
      supplierId: 'recP',
      supplierLeadTimeDays: 30,
    });
    expect(snapshot.garments[0]).toMatchObject({ phase: 'Producción', materialsCost: 10.48, criticalLeadTimeDays: 30, risk: 'Rojo' });
  });

  it('turns empty, erroneous or unknown values into null instead of failing', () => {
    const snapshot = mapSnapshot({
      ...empty,
      garments: [{ id: 'recG', fields: { Nombre: 'Sin datos', 'Coste materiales': { error: '#ERROR!' }, Riesgo: 'Morado', Fase: 'Otra' } }],
      bom: [{ id: 'recB', fields: { Prenda: ['recG'] } }],
    });

    expect(snapshot.garments[0]).toEqual({
      id: 'recG',
      code: '',
      name: 'Sin datos',
      category: '',
      phase: null,
      materialsCost: null,
      criticalLeadTimeDays: null,
      risk: null,
    });
    expect(snapshot.bom[0]).toEqual({ id: 'recB', garmentId: 'recG', fabricId: null, trimId: null, quantity: null, unit: null, lineCost: null });
  });
});
