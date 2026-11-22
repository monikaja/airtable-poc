import { describe, expect, it } from 'vitest';
import { searchRoute } from '../api/_lib/routes';
import { AirtableReadError } from '../api/_lib/airtable';
import { ConfigError } from '../api/_lib/snapshot';
import { MAX_SEARCH_RESULTS, searchSubjects } from '../shared/search';
import { fabric, snapshot, supplier, trim } from './snapshot-builder';

const data = snapshot({
  suppliers: [
    supplier({ id: 'recP1', name: 'Anatolia Dokuma', country: 'Turquía' }),
    supplier({ id: 'recP2', name: 'Cremalleras Duero', country: 'España', status: 'En revisión' }),
  ],
  fabrics: [
    fabric({ id: 'recF1', code: 'TJ-007', name: 'Sarga 65/35 marino', composition: '65 % poliéster, 35 % algodón', status: 'Descatalogado', supplierId: 'recP1' }),
    fabric({ id: 'recF2', code: 'TJ-012', name: 'Sarga algodón marino', composition: '100 % algodón' }),
  ],
  trims: [trim({ id: 'recA1', reference: 'AV-005', type: 'Cremallera', status: 'En revisión', supplierId: 'recP2' })],
});

describe('searchSubjects', () => {
  it('finds fabrics, trims and suppliers by code, name or type, ignoring case and accents', () => {
    expect(searchSubjects(data, 'tj-007')).toEqual([
      { tipo: 'tejido', id: 'recF1', label: 'TJ-007 · Sarga 65/35 marino', detail: '65 % poliéster, 35 % algodón', status: 'Descatalogado' },
    ]);
    expect(searchSubjects(data, 'ALGODON').map((result) => result.id)).toEqual(['recF2']);
    expect(searchSubjects(data, 'anatolia')).toEqual([
      { tipo: 'proveedor', id: 'recP1', label: 'Anatolia Dokuma', detail: 'Turquía', status: 'Activo' },
    ]);
  });

  it('describes a trim by its type and its supplier', () => {
    expect(searchSubjects(data, 'av-005')).toEqual([
      { tipo: 'avio', id: 'recA1', label: 'AV-005 · Cremallera', detail: 'Cremalleras Duero', status: 'En revisión' },
    ]);
  });

  it('lists matches at the start of a word first, then fabrics, trims and suppliers', () => {
    expect(searchSubjects(data, 'crema').map((result) => result.id)).toEqual(['recA1', 'recP2']);
    expect(searchSubjects(data, 'sarga').map((result) => result.id)).toEqual(['recF1', 'recF2']);
    expect(searchSubjects(data, 'marino').map((result) => result.id)).toEqual(['recF1', 'recF2']);
  });

  it('puts a match at the start of a word before a match inside a word, whatever the kind', () => {
    const withSupplier = snapshot({ ...data, suppliers: [supplier({ id: 'recP3', name: 'Argante Textil' })] });
    expect(searchSubjects(withSupplier, 'arga').map((result) => result.id)).toEqual(['recP3', 'recF1', 'recF2']);
  });

  it('returns nothing for queries shorter than 2 characters', () => {
    expect(searchSubjects(data, ' t ')).toEqual([]);
  });

  it(`returns at most ${MAX_SEARCH_RESULTS} results`, () => {
    const many = snapshot({ fabrics: Array.from({ length: 30 }, (_, index) => fabric({ id: `rec${index}`, name: 'Sarga' })) });
    expect(searchSubjects(many, 'sarga')).toHaveLength(MAX_SEARCH_RESULTS);
  });
});

describe('GET /api/search', () => {
  const request = (query: string) => new Request(`http://localhost/api/search${query}`);

  it('answers with the matching subjects', async () => {
    const response = await searchRoute(request('?q=TJ-007'), async () => data);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [expect.objectContaining({ id: 'recF1', tipo: 'tejido' })] });
  });

  it('answers an empty list when q is missing', async () => {
    const response = await searchRoute(request(''), async () => data);
    expect(await response.json()).toEqual({ results: [] });
  });

  it('explains Airtable errors with 502, rate limits with 503 and configuration errors with 500', async () => {
    const cases: [Error, number][] = [
      [new AirtableReadError(422, 'No se pudo leer la tabla Prendas'), 502],
      [new AirtableReadError(429, 'Airtable está limitando las peticiones.'), 503],
      [new ConfigError(['AIRTABLE_TOKEN_READ']), 500],
    ];
    for (const [error, status] of cases) {
      const response = await searchRoute(request('?q=tj'), async () => Promise.reject(error));
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: error.message });
    }
  });

  it('hides unexpected errors behind a generic message', async () => {
    const response = await searchRoute(request('?q=tj'), async () => Promise.reject(new Error('secret detail')));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Error inesperado del servidor.' });
  });
});
