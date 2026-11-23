import type { MaterialStatus, TrimType } from './schema.js';

// Deterministic compatibility rule for alternatives. The LLM never decides
// compatibility: it only explains alternatives that already passed this filter.
//
// Fabrics: same set of fibers, each percentage within 10 points, and weight
// within ±10 % of the reference fabric.
// Trims: same type (trims have no composition or weight).
// Both: never the reference itself and never a discontinued material.

export const COMPOSITION_TOLERANCE_POINTS = 10;
export const WEIGHT_TOLERANCE_RATIO = 0.1;

export type Composition = Record<string, number>;

export interface FabricCandidate {
  id: string;
  /** Free text such as "65 % poliéster, 35 % algodón". */
  composition: string;
  weightGsm: number;
  status: MaterialStatus;
}

export interface TrimCandidate {
  id: string;
  type: TrimType;
  status: MaterialStatus;
}

const COMPOSITION_PART = /(\d+(?:[.,]\d+)?)\s*%\s*([^,]+)/g;
const FLOAT_EPSILON = 1e-9;

/** Parses "65 % poliéster, 35 % algodón". Returns null when it does not add up to 100 %. */
export function parseComposition(text: string): Composition | null {
  const composition: Composition = {};
  let total = 0;

  for (const match of text.matchAll(COMPOSITION_PART)) {
    const [, rawPercentage = '', rawFiber = ''] = match;
    const percentage = Number(rawPercentage.replace(',', '.'));
    const fiber = rawFiber.trim().toLocaleLowerCase('es').normalize('NFC');
    composition[fiber] = (composition[fiber] ?? 0) + percentage;
    total += percentage;
  }

  if (Object.keys(composition).length === 0 || Math.abs(total - 100) > FLOAT_EPSILON) {
    return null;
  }
  return composition;
}

function isCompositionSimilar(reference: Composition, candidate: Composition): boolean {
  const referenceFibers = Object.keys(reference);
  if (referenceFibers.length !== Object.keys(candidate).length) return false;

  return referenceFibers.every((fiber) => {
    const candidatePercentage = candidate[fiber];
    return (
      candidatePercentage !== undefined &&
      Math.abs(candidatePercentage - (reference[fiber] ?? 0)) <= COMPOSITION_TOLERANCE_POINTS + FLOAT_EPSILON
    );
  });
}

function isWeightSimilar(referenceGsm: number, candidateGsm: number): boolean {
  return Math.abs(candidateGsm - referenceGsm) <= referenceGsm * WEIGHT_TOLERANCE_RATIO + FLOAT_EPSILON;
}

function isEligible(referenceId: string, candidate: { id: string; status: MaterialStatus }): boolean {
  return candidate.id !== referenceId && candidate.status !== 'Descatalogado';
}

/** Every compatible fabric, in input order. Sorting and the top-3 cut belong to the caller. */
export function findCompatibleFabrics<T extends FabricCandidate>(reference: FabricCandidate, candidates: T[]): T[] {
  const referenceComposition = parseComposition(reference.composition);
  if (!referenceComposition) return [];

  return candidates.filter((candidate) => {
    if (!isEligible(reference.id, candidate)) return false;
    const candidateComposition = parseComposition(candidate.composition);
    return (
      candidateComposition !== null &&
      isCompositionSimilar(referenceComposition, candidateComposition) &&
      isWeightSimilar(reference.weightGsm, candidate.weightGsm)
    );
  });
}

/** Every compatible trim, in input order. */
export function findCompatibleTrims<T extends TrimCandidate>(reference: TrimCandidate, candidates: T[]): T[] {
  return candidates.filter((candidate) => isEligible(reference.id, candidate) && candidate.type === reference.type);
}
