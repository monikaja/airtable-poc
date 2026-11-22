import { searchSubjects } from '../../shared/search.js';
import type { Snapshot } from '../../shared/types.js';
import { AirtableReadError } from './airtable.js';
import { ConfigError } from './snapshot.js';

// Route logic, separate from the Vercel entry files so tests can pass a fake snapshot.

export type SnapshotLoader = () => Promise<Snapshot>;

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AirtableReadError) {
    return jsonResponse({ error: error.message }, error.status === 429 ? 503 : 502);
  }
  if (error instanceof ConfigError) {
    console.error(error.message);
    return jsonResponse({ error: error.message }, 500);
  }
  console.error(error);
  return jsonResponse({ error: 'Error inesperado del servidor.' }, 500);
}

export async function searchRoute(request: Request, loadSnapshot: SnapshotLoader): Promise<Response> {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  try {
    return jsonResponse({ results: searchSubjects(await loadSnapshot(), query) });
  } catch (error) {
    return errorResponse(error);
  }
}
