import { SIMULATION_RANGE } from '../shared/simulation';
import { SUBJECT_KINDS, type SubjectKind } from '../shared/types';

/** What a shared link opens: one material or supplier and, optionally, a simulated price change. */
export interface ShareState {
  tipo: SubjectKind;
  id: string;
  pricePct: number;
}

function isSubjectKind(value: string | null): value is SubjectKind {
  return value !== null && (SUBJECT_KINDS as readonly string[]).includes(value);
}

/** Reads the shared state from a query string; an invalid simulation falls back to the current price. */
export function readShareState(search: string): ShareState | null {
  const params = new URLSearchParams(search);
  const tipo = params.get('tipo');
  const id = params.get('id')?.trim();
  if (!isSubjectKind(tipo) || !id) return null;

  const sim = Number(params.get('sim') ?? 0);
  const validSim = Number.isInteger(sim) && sim >= SIMULATION_RANGE.min && sim <= SIMULATION_RANGE.max;
  return { tipo, id, pricePct: validSim ? sim : 0 };
}

/** Writes the query string for a shared link; the simulation is only included when the price was changed. */
export function writeShareSearch(state: ShareState | null): string {
  if (!state) return '';
  const params = new URLSearchParams({ tipo: state.tipo, id: state.id });
  if (state.pricePct !== 0) params.set('sim', String(state.pricePct));
  return `?${params}`;
}
