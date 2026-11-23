import { findAlternatives, templateExplanation } from '../../shared/alternatives.js';
import { computeImpact } from '../../shared/impact.js';
import { searchSubjects } from '../../shared/search.js';
import { isSubjectKind, type AlternativesResult, type Snapshot, type SubjectKind } from '../../shared/types.js';
import { AirtableReadError } from './airtable.js';
import type { Explainer } from './explainer.js';
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

const NOT_FOUND_MESSAGES: Record<SubjectKind, string> = {
  tejido: 'No se encontró el tejido.',
  avio: 'No se encontró el avío.',
  proveedor: 'No se encontró el proveedor.',
};

export async function impactRoute(request: Request, loadSnapshot: SnapshotLoader): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const tipo = params.get('tipo');
  const id = params.get('id');
  if (!isSubjectKind(tipo)) return jsonResponse({ error: 'El parámetro tipo debe ser tejido, avio o proveedor.' }, 400);
  if (!id) return jsonResponse({ error: 'Falta el parámetro id.' }, 400);

  try {
    const impact = computeImpact(await loadSnapshot(), tipo, id);
    return impact ? jsonResponse(impact) : jsonResponse({ error: NOT_FOUND_MESSAGES[tipo] }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function alternativesRoute(
  request: Request,
  loadSnapshot: SnapshotLoader,
  explainer: Explainer | null,
): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return jsonResponse({ error: 'Falta el parámetro id.' }, 400);

  let base;
  try {
    base = findAlternatives(await loadSnapshot(), id);
  } catch (error) {
    return errorResponse(error);
  }
  if (!base) return jsonResponse({ error: 'No se encontró el material.' }, 404);

  // The answer never depends on the LLM: any sentence it does not provide comes from the template.
  let sentences = new Map<string, string>();
  if (base.alternatives.length > 0 && explainer) {
    try {
      sentences = await explainer(base);
    } catch (error) {
      console.error('No se pudieron redactar las explicaciones de alternativas:', error);
    }
  }

  const result: AlternativesResult = {
    reference: base.reference,
    alternatives: base.alternatives.map((option) => {
      const sentence = sentences.get(option.id);
      return sentence
        ? { ...option, explanation: sentence, explanationSource: 'llm' as const }
        : { ...option, explanation: templateExplanation(base.reference, option), explanationSource: 'plantilla' as const };
    }),
  };
  return jsonResponse(result);
}
