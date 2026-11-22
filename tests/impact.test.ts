import { describe, expect, it } from 'vitest';
import { impactRoute } from '../api/_lib/routes';
import { computeImpact } from '../shared/impact';
import { bomLine, catalogLine, client, fabric, garment, snapshot, supplier, trim } from './snapshot-builder';

// A reduced copy of the demo: TJ-007 (discontinued) in PR-001, PR-002 and PR-003.
const data = snapshot({
  suppliers: [supplier({ id: 'recP4', name: 'Anatolia Dokuma' }), supplier({ id: 'recP12', name: 'Cremalleras Duero' })],
  fabrics: [
    fabric({ id: 'recTJ7', code: 'TJ-007', name: 'Sarga 65/35 marino', status: 'Descatalogado', supplierId: 'recP4' }),
    fabric({ id: 'recTJ30', code: 'TJ-030', name: 'Lino lavado blanco', supplierId: 'recP4' }),
  ],
  trims: [trim({ id: 'recAV7', reference: 'AV-007', type: 'Cremallera', supplierId: 'recP12' })],
  garments: [
    garment({ id: 'recPR1', code: 'PR-001', name: 'Pantalón multibolsillos', materialsCost: 8, risk: 'Rojo', criticalLeadTimeDays: 30 }),
    garment({ id: 'recPR2', code: 'PR-002', name: 'Chaqueta de trabajo', materialsCost: 10.31, risk: 'Rojo' }),
    garment({ id: 'recPR3', code: 'PR-003', name: 'Peto de trabajo', materialsCost: 10.48, risk: 'Rojo' }),
    garment({ id: 'recPR22', code: 'PR-022', name: 'Chaqueta ignífuga', phase: 'Muestra', materialsCost: 25.4, risk: 'Verde' }),
  ],
  bom: [
    bomLine({ id: 'b1', garmentId: 'recPR1', fabricId: 'recTJ7', lineCost: 6.72 }),
    bomLine({ id: 'b2', garmentId: 'recPR1', trimId: 'recAV7', unit: 'ud', lineCost: 1.2 }),
    bomLine({ id: 'b3', garmentId: 'recPR2', fabricId: 'recTJ7', lineCost: 8.64 }),
    bomLine({ id: 'b4', garmentId: 'recPR3', fabricId: 'recTJ7', lineCost: 10.08 }),
    bomLine({ id: 'b5', garmentId: 'recPR22', trimId: 'recAV7', unit: 'ud', lineCost: 1.2 }),
  ],
  clients: [
    client({ id: 'recCL1', name: 'Clínica Mirasol' }),
    client({ id: 'recCL2', name: 'Logística Portal Sur', sector: 'Logística' }),
    client({ id: 'recCL3', name: 'Hoteles Brisa Atlántica', sector: 'Hostelería' }),
    client({ id: 'recCL9', name: 'Sin prendas afectadas' }),
  ],
  catalog: [
    catalogLine({ id: 'c1', clientId: 'recCL1', garmentId: 'recPR1', annualUnits: 80, annualCost: 640 }),
    catalogLine({ id: 'c2', clientId: 'recCL2', garmentId: 'recPR1', annualUnits: 900, annualCost: 7200 }),
    catalogLine({ id: 'c3', clientId: 'recCL2', garmentId: 'recPR2', annualUnits: 400, annualCost: 4124 }),
    catalogLine({ id: 'c4', clientId: 'recCL3', garmentId: 'recPR3', annualUnits: 120, annualCost: 1257.6 }),
    catalogLine({ id: 'c5', clientId: 'recCL9', garmentId: 'recPR22', annualUnits: 50, annualCost: 1270 }),
  ],
});

describe('computeImpact', () => {
  it('lists the garments that use a fabric, with their Airtable values and affected material cost', () => {
    const impact = computeImpact(data, 'tejido', 'recTJ7');

    expect(impact?.subject).toEqual({ tipo: 'tejido', id: 'recTJ7', label: 'TJ-007 · Sarga 65/35 marino', status: 'Descatalogado', materialCount: 1 });
    expect(impact?.garments).toEqual([
      { id: 'recPR1', code: 'PR-001', name: 'Pantalón multibolsillos', phase: 'Producción', risk: 'Rojo', materialsCost: 8, criticalLeadTimeDays: 30, affectedMaterialCost: 6.72 },
      { id: 'recPR2', code: 'PR-002', name: 'Chaqueta de trabajo', phase: 'Producción', risk: 'Rojo', materialsCost: 10.31, criticalLeadTimeDays: 20, affectedMaterialCost: 8.64 },
      { id: 'recPR3', code: 'PR-003', name: 'Peto de trabajo', phase: 'Producción', risk: 'Rojo', materialsCost: 10.48, criticalLeadTimeDays: 20, affectedMaterialCost: 10.08 },
    ]);
  });

  it('adds up units, annual cost and the simulation base per client, highest annual cost first', () => {
    const impact = computeImpact(data, 'tejido', 'recTJ7');

    expect(impact?.clients).toEqual([
      // 900 × 6.72 + 400 × 8.64 = 6048 + 3456
      { id: 'recCL2', name: 'Logística Portal Sur', sector: 'Logística', garmentCount: 2, annualUnits: 1300, annualCost: 11324, affectedAnnualMaterialCost: 9504 },
      { id: 'recCL3', name: 'Hoteles Brisa Atlántica', sector: 'Hostelería', garmentCount: 1, annualUnits: 120, annualCost: 1257.6, affectedAnnualMaterialCost: 1209.6 },
      { id: 'recCL1', name: 'Clínica Mirasol', sector: 'Sanidad', garmentCount: 1, annualUnits: 80, annualCost: 640, affectedAnnualMaterialCost: 537.6 },
    ]);
    expect(impact?.totals).toEqual({
      garmentCount: 3,
      clientCount: 3,
      annualUnits: 1500,
      annualCost: 13221.6,
      affectedAnnualMaterialCost: 11251.2,
    });
  });

  it('covers every material of a supplier', () => {
    const impact = computeImpact(data, 'proveedor', 'recP4');
    expect(impact?.subject).toEqual({ tipo: 'proveedor', id: 'recP4', label: 'Anatolia Dokuma', status: 'Activo', materialCount: 2 });
    expect(impact?.garments.map((item) => item.code)).toEqual(['PR-001', 'PR-002', 'PR-003']);
  });

  it('counts a trim in garments of any phase', () => {
    const impact = computeImpact(data, 'avio', 'recAV7');
    expect(impact?.subject.label).toBe('AV-007 · Cremallera');
    expect(impact?.garments.map((item) => [item.code, item.affectedMaterialCost])).toEqual([
      ['PR-001', 1.2],
      ['PR-022', 1.2],
    ]);
    expect(impact?.clients.map((item) => item.id)).toEqual(['recCL2', 'recCL9', 'recCL1']);
  });

  it('orders garments by risk (red, amber, green, unknown) and then by code', () => {
    const mixed = snapshot({
      ...data,
      garments: [
        garment({ id: 'g1', code: 'PR-001', risk: null }),
        garment({ id: 'g2', code: 'PR-002', risk: 'Verde' }),
        garment({ id: 'g3', code: 'PR-003', risk: 'Ámbar' }),
        garment({ id: 'g4', code: 'PR-004', risk: 'Rojo' }),
        garment({ id: 'g5', code: 'PR-000', risk: 'Verde' }),
      ],
      bom: ['g1', 'g2', 'g3', 'g4', 'g5'].map((id) => bomLine({ id: `b-${id}`, garmentId: id, fabricId: 'recTJ7' })),
    });
    expect(computeImpact(mixed, 'tejido', 'recTJ7')?.garments.map((item) => item.code)).toEqual([
      'PR-004',
      'PR-003',
      'PR-000',
      'PR-002',
      'PR-001',
    ]);
  });

  it('returns empty lists and zero totals for a material without use', () => {
    const impact = computeImpact(data, 'tejido', 'recTJ30');
    expect(impact).toMatchObject({
      garments: [],
      clients: [],
      totals: { garmentCount: 0, clientCount: 0, annualUnits: 0, annualCost: 0, affectedAnnualMaterialCost: 0 },
    });
  });

  it('treats empty Airtable values as zero and rounds money to cents', () => {
    const rounding = snapshot({
      ...data,
      bom: [
        bomLine({ id: 'r1', garmentId: 'recPR1', fabricId: 'recTJ7', lineCost: 0.1 }),
        bomLine({ id: 'r2', garmentId: 'recPR1', fabricId: 'recTJ7', lineCost: 0.2 }),
        bomLine({ id: 'r3', garmentId: 'recPR2', fabricId: 'recTJ7', lineCost: null }),
      ],
      catalog: [catalogLine({ id: 'c', clientId: 'recCL1', garmentId: 'recPR2', annualUnits: null, annualCost: null })],
    });
    const impact = computeImpact(rounding, 'tejido', 'recTJ7');
    expect(impact?.garments.map((item) => item.affectedMaterialCost)).toEqual([0.3, 0]);
    expect(impact?.clients[0]).toMatchObject({ annualUnits: 0, annualCost: 0, affectedAnnualMaterialCost: 0 });
  });

  it('returns null when the subject does not exist or is of another kind', () => {
    expect(computeImpact(data, 'tejido', 'recNOPE')).toBeNull();
    expect(computeImpact(data, 'avio', 'recTJ7')).toBeNull();
  });
});

describe('GET /api/impact', () => {
  const request = (query: string) => new Request(`http://localhost/api/impact${query}`);
  const load = async () => data;

  it('answers the impact of the subject', async () => {
    const response = await impactRoute(request('?tipo=tejido&id=recTJ7'), load);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ subject: { id: 'recTJ7' }, totals: { garmentCount: 3, clientCount: 3 } });
  });

  it('rejects an unknown tipo or a missing id with 400', async () => {
    const badKind = await impactRoute(request('?tipo=prenda&id=recTJ7'), load);
    expect(badKind.status).toBe(400);
    expect(await badKind.json()).toEqual({ error: 'El parámetro tipo debe ser tejido, avio o proveedor.' });

    const noId = await impactRoute(request('?tipo=tejido'), load);
    expect(noId.status).toBe(400);
    expect(await noId.json()).toEqual({ error: 'Falta el parámetro id.' });
  });

  it('answers 404 with the kind of subject that was not found', async () => {
    const response = await impactRoute(request('?tipo=avio&id=recNOPE'), load);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'No se encontró el avío.' });
  });
});
