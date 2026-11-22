import type { SearchResult, Snapshot, SubjectKind } from './types.js';

// Search over fabrics (code, name), trims (reference, type) and suppliers (name).
// Case- and accent-insensitive. Matches at the start of a word rank first.

export const MIN_QUERY_LENGTH = 2;
export const MAX_SEARCH_RESULTS = 20;

const KIND_ORDER: Record<SubjectKind, number> = { tejido: 0, avio: 1, proveedor: 2 };
const WORD_SEPARATOR = /[^\p{L}\p{N}]/u;

export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim();
}

/** 0 = some occurrence starts a word, 1 = only inside a word, null = no match. */
function matchRank(haystack: string, query: string): 0 | 1 | null {
  let index = haystack.indexOf(query);
  if (index < 0) return null;
  while (index >= 0) {
    const previous = haystack[index - 1];
    if (index === 0 || (previous !== undefined && WORD_SEPARATOR.test(previous))) return 0;
    index = haystack.indexOf(query, index + 1);
  }
  return 1;
}

export function searchSubjects(snapshot: Snapshot, rawQuery: string): SearchResult[] {
  const query = normalizeForSearch(rawQuery);
  if (query.length < MIN_QUERY_LENGTH) return [];

  const supplierNames = new Map(snapshot.suppliers.map((supplier) => [supplier.id, supplier.name]));
  const candidates: { result: SearchResult; haystack: string }[] = [
    ...snapshot.fabrics.map((fabric) => ({
      haystack: `${fabric.code} ${fabric.name}`,
      result: {
        tipo: 'tejido' as const,
        id: fabric.id,
        label: `${fabric.code} · ${fabric.name}`,
        detail: fabric.composition,
        status: fabric.status,
      },
    })),
    ...snapshot.trims.map((trim) => ({
      haystack: `${trim.reference} ${trim.type ?? ''}`,
      result: {
        tipo: 'avio' as const,
        id: trim.id,
        label: trim.type ? `${trim.reference} · ${trim.type}` : trim.reference,
        detail: (trim.supplierId && supplierNames.get(trim.supplierId)) || '',
        status: trim.status,
      },
    })),
    ...snapshot.suppliers.map((supplier) => ({
      haystack: supplier.name,
      result: { tipo: 'proveedor' as const, id: supplier.id, label: supplier.name, detail: supplier.country, status: supplier.status },
    })),
  ];

  return candidates
    .map(({ result, haystack }) => ({ result, rank: matchRank(normalizeForSearch(haystack), query) }))
    .filter((candidate): candidate is { result: SearchResult; rank: 0 | 1 } => candidate.rank !== null)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        KIND_ORDER[a.result.tipo] - KIND_ORDER[b.result.tipo] ||
        a.result.label.localeCompare(b.result.label, 'es'),
    )
    .slice(0, MAX_SEARCH_RESULTS)
    .map((candidate) => candidate.result);
}
