import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '../src/api/client';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  it('calls the internal API with encoded parameters', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => json({ results: [] }));
    const api = createApiClient(fetchImpl);

    await api.search('sarga marino');
    await api.impact('avio', 'rec 1');
    await api.alternatives('recF/1');

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      '/api/search?q=sarga+marino',
      '/api/impact?tipo=avio&id=rec+1',
      '/api/alternatives?id=recF%2F1',
    ]);
  });

  it('returns the search results', async () => {
    const api = createApiClient(async () => json({ results: [{ id: 'recF1' }] }));
    expect(await api.search('tj')).toEqual([{ id: 'recF1' }]);
  });

  it('turns API errors into their Spanish message and status', async () => {
    const api = createApiClient(async () => json({ error: 'No se encontró el tejido.' }, 404));
    await expect(api.impact('tejido', 'NOPE')).rejects.toEqual(new ApiError('No se encontró el tejido.', 404));
  });

  it('explains when the server cannot be reached or answers without JSON', async () => {
    const offline = createApiClient(async () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(offline.search('tj')).rejects.toEqual(new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0));

    const html = createApiClient(async () => new Response('<html>', { status: 502 }));
    await expect(html.search('tj')).rejects.toEqual(new ApiError('El servidor respondió con un error (502).', 502));
  });

  it('lets a newer request cancel an older one', async () => {
    const api = createApiClient(async (_url, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException('aborted', 'AbortError');
    });
    await expect(api.search('tj', new AbortController().signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
