import { describe, expect, it } from 'vitest';
import { SIMULATION_RANGE, simulateClient, simulateGarment, simulateTotals } from '../shared/simulation';
import type { AffectedClient, AffectedGarment, ImpactResult } from '../shared/types';

const garment: AffectedGarment = {
  id: 'G1', code: 'PR-001', name: 'Pantalón', phase: 'Producción', risk: 'Rojo',
  materialsCost: 8, criticalLeadTimeDays: 30, affectedMaterialCost: 6,
};
const client: AffectedClient = {
  id: 'C1', name: 'Hospital', sector: 'Sanidad', garmentCount: 2, annualUnits: 1000,
  annualCost: 8000, affectedAnnualMaterialCost: 6000,
};

describe('price simulation', () => {
  it('offers the PRD range, from −20 % to +40 %', () => {
    expect(SIMULATION_RANGE).toEqual({ min: -20, max: 40, step: 1 });
  });

  it('changes only the affected part of a garment cost', () => {
    expect(simulateGarment(garment, 10)).toEqual({ current: 8, simulated: 8.6, delta: 0.6, deltaPct: 7.5 });
    expect(simulateGarment(garment, -20)).toEqual({ current: 8, simulated: 6.8, delta: -1.2, deltaPct: -15 });
  });

  it('leaves everything unchanged at 0 %', () => {
    expect(simulateGarment(garment, 0)).toEqual({ current: 8, simulated: 8, delta: 0, deltaPct: 0 });
  });

  it('cannot compare a garment whose cost is unknown', () => {
    expect(simulateGarment({ ...garment, materialsCost: null }, 10)).toEqual({ current: null, simulated: null, delta: 0.6, deltaPct: null });
  });

  it('gives the annual impact per client in €', () => {
    expect(simulateClient(client, 15)).toEqual({ current: 8000, simulated: 8900, delta: 900, deltaPct: 11.3 });
  });

  it('gives the annual impact of all clients', () => {
    const impact = { totals: { annualCost: 28686.6, affectedAnnualMaterialCost: 12000 } } as ImpactResult;
    expect(simulateTotals(impact, 5)).toEqual({ current: 28686.6, simulated: 29286.6, delta: 600, deltaPct: 2.1 });
  });

  it('reports no percentage when the current cost is zero', () => {
    expect(simulateClient({ ...client, annualCost: 0, affectedAnnualMaterialCost: 0 }, 10)).toEqual({ current: 0, simulated: 0, delta: 0, deltaPct: null });
  });
});
