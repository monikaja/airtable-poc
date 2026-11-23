import type { BomLine, CatalogLine, Client, Fabric, Garment, Snapshot, Supplier, Trim } from '../shared/types';

// Small hand-made snapshots for tests. Computed values are given explicitly,
// as Airtable would return them.

export const supplier = (overrides: Partial<Supplier> & { id: string }): Supplier => ({
  name: overrides.id,
  country: 'España',
  leadTimeDays: 20,
  status: 'Activo',
  ...overrides,
});

export const fabric = (overrides: Partial<Fabric> & { id: string }): Fabric => ({
  code: overrides.id,
  name: `Tejido ${overrides.id}`,
  composition: '100 % algodón',
  weightGsm: 200,
  color: 'Blanco',
  pricePerMeter: 4,
  status: 'Activo',
  supplierId: null,
  supplierLeadTimeDays: null,
  priceUpdatedOn: null,
  ...overrides,
});

export const trim = (overrides: Partial<Trim> & { id: string }): Trim => ({
  reference: overrides.id,
  type: 'Botón',
  pricePerUnit: 0.1,
  status: 'Activo',
  supplierId: null,
  supplierLeadTimeDays: null,
  priceUpdatedOn: null,
  ...overrides,
});

export const garment = (overrides: Partial<Garment> & { id: string }): Garment => ({
  code: overrides.id,
  name: `Prenda ${overrides.id}`,
  category: 'Pantalón',
  phase: 'Producción',
  materialsCost: 10,
  criticalLeadTimeDays: 20,
  risk: 'Verde',
  ...overrides,
});

export const bomLine = (overrides: Partial<BomLine> & { id: string }): BomLine => ({
  garmentId: null,
  fabricId: null,
  trimId: null,
  quantity: 1,
  unit: 'm',
  lineCost: 0,
  ...overrides,
});

export const client = (overrides: Partial<Client> & { id: string }): Client => ({
  name: `Cliente ${overrides.id}`,
  sector: 'Sanidad',
  employees: 100,
  ...overrides,
});

export const catalogLine = (overrides: Partial<CatalogLine> & { id: string }): CatalogLine => ({
  clientId: null,
  garmentId: null,
  annualUnits: 0,
  annualCost: 0,
  ...overrides,
});

export const snapshot = (overrides: Partial<Snapshot>): Snapshot => ({
  suppliers: [],
  fabrics: [],
  trims: [],
  garments: [],
  bom: [],
  clients: [],
  catalog: [],
  ...overrides,
});
