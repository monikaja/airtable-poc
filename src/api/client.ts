import type { AlternativesResult, ImpactResult, SearchResult, SubjectKind } from '../../shared/types';

// The browser only talks to our own /api: never to Airtable or the LLM.

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when the server could not be reached. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function createApiClient(fetchImpl: FetchLike = (url, init) => fetch(url, init)) {
  async function getJson<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
    const url = `${path}?${new URLSearchParams(params)}`;
    let response: Response;
    try {
      response = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0);
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || body === null) {
      const message =
        body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : `El servidor respondió con un error (${response.status}).`;
      throw new ApiError(message, response.status);
    }
    return body as T;
  }

  return {
    async search(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
      return (await getJson<{ results: SearchResult[] }>('/api/search', { q }, signal)).results;
    },
    impact(tipo: SubjectKind, id: string, signal?: AbortSignal): Promise<ImpactResult> {
      return getJson('/api/impact', { tipo, id }, signal);
    },
    alternatives(id: string, signal?: AbortSignal): Promise<AlternativesResult> {
      return getJson('/api/alternatives', { id }, signal);
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export const api = createApiClient();
