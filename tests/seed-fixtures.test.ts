import { describe, expect, it } from 'vitest';
import { findCompatibleFabrics } from '../shared/compatibility';
import { fixtures, type Fixtures } from '../scripts/seed/fixtures';
import { validateFixtures } from '../scripts/seed/validate';

const clone = (): Fixtures => structuredClone(fixtures);
const asCandidates = (data: Fixtures) => data.fabrics.map((fabric) => ({ ...fabric, id: fabric.code }));

describe('demo fixtures', () => {
  it('pass validation', () => {
    expect(validateFixtures(fixtures)).toEqual([]);
  });

  it('have the planned volume', () => {
    expect({
      suppliers: fixtures.suppliers.length,
      fabrics: fixtures.fabrics.length,
      trims: fixtures.trims.length,
      garments: fixtures.garments.length,
      bomLines: fixtures.garments.flatMap((garment) => garment.bom).length,
      samples: fixtures.samples.length,
      clients: fixtures.clients.length,
      catalog: fixtures.catalog.length,
    }).toEqual({ suppliers: 15, fabrics: 30, trims: 20, garments: 25, bomLines: 62, samples: 30, clients: 8, catalog: 40 });
  });

  it('use TJ-007 in exactly three garments in production, reaching four clients', () => {
    const garments = fixtures.garments.filter((garment) => garment.bom.some((line) => line.material === 'TJ-007'));
    expect(garments.map((garment) => [garment.code, garment.phase])).toEqual([
      ['PR-001', 'Producción'],
      ['PR-002', 'Producción'],
      ['PR-003', 'Producción'],
    ]);
    const clients = new Set(fixtures.catalog.filter((line) => ['PR-001', 'PR-002', 'PR-003'].includes(line.garment)).map((line) => line.client));
    expect([...clients].sort()).toEqual(['CL1', 'CL2', 'CL3', 'CL4']);
  });

  it('offer exactly TJ-008, TJ-009 and TJ-010 as alternatives to TJ-007', () => {
    const reference = asCandidates(fixtures).find((fabric) => fabric.code === 'TJ-007');
    expect(reference).toBeDefined();
    const alternatives = findCompatibleFabrics(reference!, asCandidates(fixtures));
    expect(alternatives.map((fabric) => fabric.code)).toEqual(['TJ-008', 'TJ-009', 'TJ-010']);
  });

  it('leave TJ-030 as the only material without use', () => {
    const used = new Set(fixtures.garments.flatMap((garment) => garment.bom.map((line) => line.material)));
    const materials = [...fixtures.fabrics.map((fabric) => fabric.code), ...fixtures.trims.map((trim) => trim.reference)];
    expect(materials.filter((material) => !used.has(material))).toEqual(['TJ-030']);
  });
});

describe('validateFixtures', () => {
  it('rejects a BOM line that does not link exactly one fabric or trim', () => {
    const data = clone();
    data.garments[0]!.bom.push({ material: 'XX-999', quantity: 1 });
    expect(validateFixtures(data)).toContain('PR-001: la línea de BOM XX-999 debe enlazar exactamente un tejido o un avío');
  });

  it('rejects references to suppliers, clients or garments that do not exist', () => {
    const data = clone();
    data.fabrics[0]!.supplier = 'P99';
    data.catalog[0]!.client = 'CL9';
    data.samples[0]!.garment = 'PR-999';
    expect(validateFixtures(data)).toEqual(
      expect.arrayContaining([
        'TJ-001: proveedor inexistente P99',
        'Catálogo: cliente inexistente CL9',
        'Muestras: prenda inexistente PR-999',
      ]),
    );
  });

  it('rejects repeated identifiers', () => {
    const data = clone();
    data.trims[1]!.reference = 'AV-001';
    expect(validateFixtures(data)).toContain('Identificador de material repetido: AV-001');
  });

  it('reports a missing demo case', () => {
    const data = clone();
    for (const fabric of data.fabrics) fabric.status = fabric.status === 'Descatalogado' ? 'Activo' : fabric.status;
    expect(validateFixtures(data)).toEqual([
      'Demo: falta un tejido descatalogado usado en 3 prendas en producción, por 4 clientes y con 2–3 alternativas compatibles',
    ]);
  });

  it('reports when no material is left unused', () => {
    const data = clone();
    data.garments[0]!.bom.push({ material: 'TJ-030', quantity: 0.1 });
    expect(validateFixtures(data)).toEqual(['Demo: falta un material sin ningún uso']);
  });
});
