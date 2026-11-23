import type { ImpactResult } from '../shared/types';

/** Today's local date as Airtable writes it, so the fixture price is always up to date. */
const today = new Date();
export const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

/** TJ-007 as in the demo base: discontinued, used by 3 garments in production. */
export const impactResult: ImpactResult = {
  subject: { tipo: 'tejido', id: 'recF7', label: 'TJ-007 · Sarga 65/35 marino', status: 'Descatalogado', materialCount: 1, priceUpdatedOn: todayIso },
  garments: [
    { id: 'G1', code: 'PR-001', name: 'Pantalón multibolsillos', phase: 'Producción', risk: 'Rojo', materialsCost: 8, criticalLeadTimeDays: 30, affectedMaterialCost: 6 },
    { id: 'G2', code: 'PR-002', name: 'Chaqueta de trabajo', phase: 'Aprobada', risk: 'Ámbar', materialsCost: 12.5, criticalLeadTimeDays: null, affectedMaterialCost: 7.2 },
    { id: 'G3', code: 'PR-003', name: 'Peto', phase: 'Diseño', risk: null, materialsCost: null, criticalLeadTimeDays: 21, affectedMaterialCost: 0 },
  ],
  clients: [
    { id: 'C1', name: 'Hospital Ribera Norte', sector: 'Sanidad', garmentCount: 2, annualUnits: 1500, annualCost: 15000, affectedAnnualMaterialCost: 9900 },
    { id: 'C2', name: 'Logística Meseta', sector: 'Logística', garmentCount: 1, annualUnits: 400, annualCost: 3200, affectedAnnualMaterialCost: 2400 },
  ],
  totals: { garmentCount: 3, clientCount: 2, annualUnits: 1900, annualCost: 18200, affectedAnnualMaterialCost: 12300 },
};
