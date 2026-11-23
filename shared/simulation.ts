import type { AffectedClient, AffectedGarment, ImpactResult } from './types.js';

// Price simulation, computed in memory only: it never writes to Airtable.
// A change of X % on the material price moves only the part of the cost that
// comes from the affected materials, never the rest of the garment.

/** Slider range from the PRD: −20 % to +40 %. */
export const SIMULATION_RANGE = { min: -20, max: 40, step: 1 } as const;

export interface SimulatedCost {
  current: number | null;
  simulated: number | null;
  /** Change in €, already rounded to cents. */
  delta: number;
  /** Change as % of the current cost, one decimal; null when it cannot be compared. */
  deltaPct: number | null;
}

const cents = (value: number): number => Math.round(value * 100);

function simulate(current: number | null, affected: number, pricePct: number): SimulatedCost {
  const deltaCents = Math.round((cents(affected) * pricePct) / 100);
  const delta = deltaCents / 100 || 0;
  if (current === null) return { current: null, simulated: null, delta, deltaPct: null };
  const currentCents = cents(current);
  return {
    current,
    simulated: (currentCents + deltaCents) / 100,
    delta,
    deltaPct: currentCents === 0 ? null : Math.round((deltaCents * 1000) / currentCents) / 10 || 0,
  };
}

export function simulateGarment(garment: AffectedGarment, pricePct: number): SimulatedCost {
  return simulate(garment.materialsCost, garment.affectedMaterialCost, pricePct);
}

export function simulateClient(client: AffectedClient, pricePct: number): SimulatedCost {
  return simulate(client.annualCost, client.affectedAnnualMaterialCost, pricePct);
}

export function simulateTotals(impact: Pick<ImpactResult, 'totals'>, pricePct: number): SimulatedCost {
  return simulate(impact.totals.annualCost, impact.totals.affectedAnnualMaterialCost, pricePct);
}
