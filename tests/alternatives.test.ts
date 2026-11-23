import { describe, expect, it } from 'vitest';
import { findAlternatives, MAX_ALTERNATIVES, templateExplanation } from '../shared/alternatives';
import type { Fabric } from '../shared/types';
import { fabric, snapshot, supplier, trim } from './snapshot-builder';

const sarga = (id: string, overrides: Partial<Fabric>) =>
  fabric({ id, code: id, name: `Sarga ${id}`, composition: '65 % poliéster, 35 % algodón', weightGsm: 245, ...overrides });

// Mirrors the demo: TJ-007 is discontinued; TJ-008, TJ-009 and TJ-010 are compatible.
const data = snapshot({
  suppliers: [
    supplier({ id: 'P1', name: 'Textiles Albera' }),
    supplier({ id: 'P2', name: 'Tecelagem do Norte' }),
    supplier({ id: 'P6', name: 'Lianhe Weaving' }),
  ],
  fabrics: [
    sarga('TJ-007', { pricePerMeter: 4.8, status: 'Descatalogado', supplierLeadTimeDays: 30, priceUpdatedOn: '2026-03-03' }),
    sarga('TJ-008', { composition: '67 % poliéster, 33 % algodón', weightGsm: 240, pricePerMeter: 5.1, supplierId: 'P1', supplierLeadTimeDays: 21 }),
    sarga('TJ-009', { composition: '60 % poliéster, 40 % algodón', weightGsm: 255, pricePerMeter: 4.6, supplierId: 'P6', supplierLeadTimeDays: 50, priceUpdatedOn: '2026-10-28' }),
    sarga('TJ-010', { composition: '70 % poliéster, 30 % algodón', weightGsm: 260, pricePerMeter: 5.4, supplierId: 'P2', supplierLeadTimeDays: 18 }),
    sarga('TJ-011', { weightGsm: 300, pricePerMeter: 5.9 }),
    sarga('TJ-012', { composition: '100 % algodón', pricePerMeter: 5.2 }),
  ],
});

describe('findAlternatives', () => {
  it('describes the reference fabric', () => {
    expect(findAlternatives(data, 'TJ-007')?.reference).toEqual({
      tipo: 'tejido',
      id: 'TJ-007',
      label: 'TJ-007 · Sarga TJ-007',
      detail: '65 % poliéster, 35 % algodón · 245 g/m²',
      price: 4.8,
      unit: 'm',
      leadTimeDays: 30,
      status: 'Descatalogado',
      priceUpdatedOn: '2026-03-03',
    });
  });

  it('returns only compatible fabrics, cheapest first when risk is equal, with price difference', () => {
    expect(findAlternatives(data, 'TJ-007')?.alternatives).toEqual([
      {
        tipo: 'tejido',
        id: 'TJ-009',
        label: 'TJ-009 · Sarga TJ-009',
        detail: '60 % poliéster, 40 % algodón · 255 g/m²',
        supplierName: 'Lianhe Weaving',
        price: 4.6,
        unit: 'm',
        priceDelta: -0.2,
        priceDeltaPct: -4.2,
        leadTimeDays: 50,
        status: 'Activo',
        risk: 'Verde',
        riskReason: null,
        priceUpdatedOn: '2026-10-28',
      },
      expect.objectContaining({ id: 'TJ-008', priceDelta: 0.3, priceDeltaPct: 6.3, supplierName: 'Textiles Albera' }),
      expect.objectContaining({ id: 'TJ-010', priceDelta: 0.6, priceDeltaPct: 12.5, leadTimeDays: 18 }),
    ]);
  });

  it('puts amber alternatives last and explains why', () => {
    const risky = snapshot({
      ...data,
      fabrics: data.fabrics.map((item) =>
        item.id === 'TJ-009' ? { ...item, supplierLeadTimeDays: 75 } : item.id === 'TJ-010' ? { ...item, status: 'En revisión' as const } : item,
      ),
    });
    const alternatives = findAlternatives(risky, 'TJ-007')?.alternatives ?? [];
    expect(alternatives.map((item) => [item.id, item.risk, item.riskReason])).toEqual([
      ['TJ-008', 'Verde', null],
      ['TJ-009', 'Ámbar', 'Plazo del proveedor de 75 días'],
      ['TJ-010', 'Ámbar', 'Material en revisión'],
    ]);
  });

  it('breaks price ties by lead time, unknown values last', () => {
    const ties = snapshot({
      fabrics: [
        sarga('REF', {}),
        sarga('A', { pricePerMeter: 5, supplierLeadTimeDays: null }),
        sarga('B', { pricePerMeter: 5, supplierLeadTimeDays: 40 }),
        sarga('C', { pricePerMeter: null, supplierLeadTimeDays: 10 }),
      ],
    });
    expect(findAlternatives(ties, 'REF')?.alternatives.map((item) => item.id)).toEqual(['B', 'A', 'C']);
  });

  it(`returns at most ${MAX_ALTERNATIVES} alternatives`, () => {
    const many = snapshot({ fabrics: [sarga('REF', {}), ...['A', 'B', 'C', 'D', 'E'].map((id) => sarga(id, {}))] });
    expect(findAlternatives(many, 'REF')?.alternatives).toHaveLength(MAX_ALTERNATIVES);
  });

  it('skips fabrics whose weight is unknown', () => {
    const unknown = snapshot({ fabrics: [sarga('REF', {}), sarga('A', { weightGsm: null })] });
    expect(findAlternatives(unknown, 'REF')?.alternatives).toEqual([]);
  });

  it('offers trims of the same type, priced per unit', () => {
    const trims = snapshot({
      suppliers: [supplier({ id: 'P12', name: 'Cremalleras Duero' })],
      trims: [
        trim({ id: 'AV-005', reference: 'AV-005', type: 'Cremallera', pricePerUnit: 0.85, status: 'En revisión' }),
        trim({ id: 'AV-006', reference: 'AV-006', type: 'Cremallera', pricePerUnit: 0.7, supplierId: 'P12', supplierLeadTimeDays: 38 }),
        trim({ id: 'AV-001', reference: 'AV-001', type: 'Botón', pricePerUnit: 0.08 }),
      ],
    });
    const result = findAlternatives(trims, 'AV-005');
    expect(result?.reference).toMatchObject({ tipo: 'avio', label: 'AV-005 · Cremallera', detail: 'Cremallera', unit: 'ud' });
    expect(result?.alternatives).toEqual([
      expect.objectContaining({ tipo: 'avio', id: 'AV-006', supplierName: 'Cremalleras Duero', price: 0.7, unit: 'ud', priceDelta: -0.15, priceDeltaPct: -17.6 }),
    ]);
  });

  it('returns null for an unknown material', () => {
    expect(findAlternatives(data, 'NOPE')).toBeNull();
  });
});

describe('templateExplanation', () => {
  const result = findAlternatives(data, 'TJ-007')!;
  const option = (id: string) => result.alternatives.find((item) => item.id === id)!;

  it('summarises compatibility, price and lead time against the reference', () => {
    expect(templateExplanation(result.reference, option('TJ-008'))).toBe(
      'Composición y gramaje compatibles; cuesta un 6,3 % más y entrega en 21 días (frente a 30).',
    );
    expect(templateExplanation(result.reference, option('TJ-009'))).toBe(
      'Composición y gramaje compatibles; cuesta un 4,2 % menos y entrega en 50 días (frente a 30).',
    );
  });

  it('adds what to watch for amber alternatives', () => {
    const amber = { ...option('TJ-010'), risk: 'Ámbar' as const, riskReason: 'Material en revisión' };
    expect(templateExplanation(result.reference, amber)).toBe(
      'Composición y gramaje compatibles; cuesta un 12,5 % más y entrega en 18 días (frente a 30). A vigilar: material en revisión.',
    );
  });

  it('says so when the lead time matches the reference', () => {
    const same = { ...option('TJ-008'), leadTimeDays: 30 };
    expect(templateExplanation(result.reference, same)).toBe('Composición y gramaje compatibles; cuesta un 6,3 % más y mismo plazo (30 días).');
  });

  it('handles trims, equal prices and unknown values', () => {
    const reference = { ...result.reference, tipo: 'avio' as const, leadTimeDays: null };
    const same = { ...option('TJ-008'), tipo: 'avio' as const, priceDelta: 0, priceDeltaPct: 0, leadTimeDays: 12 };
    expect(templateExplanation(reference, same)).toBe('Mismo tipo de avío; cuesta lo mismo y entrega en 12 días.');

    const unknown = { ...option('TJ-008'), priceDelta: null, priceDeltaPct: null, leadTimeDays: null };
    expect(templateExplanation(result.reference, unknown)).toBe(
      'Composición y gramaje compatibles; precio sin comparar y plazo sin informar.',
    );
  });
});
