import { describe, expect, it } from 'vitest';
import {
  findCompatibleFabrics,
  findCompatibleTrims,
  parseComposition,
  type FabricCandidate,
  type TrimCandidate,
} from '../shared/compatibility';

const fabric = (overrides: Partial<FabricCandidate>): FabricCandidate => ({
  id: 'ref',
  composition: '65 % poliéster, 35 % algodón',
  weightGsm: 245,
  status: 'Activo',
  ...overrides,
});

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('parseComposition', () => {
  it('reads fibers and percentages in any case and spacing', () => {
    expect(parseComposition('65 % Poliéster, 35% algodón')).toEqual({ poliéster: 65, algodón: 35 });
  });

  it('accepts decimal percentages with a comma', () => {
    expect(parseComposition('97,5 % algodón, 2,5 % elastano')).toEqual({ algodón: 97.5, elastano: 2.5 });
  });

  it('rejects compositions that do not add up to 100 %', () => {
    expect(parseComposition('65 % poliéster, 30 % algodón')).toBeNull();
  });

  it('rejects text without percentages', () => {
    expect(parseComposition('algodón')).toBeNull();
  });
});

describe('findCompatibleFabrics', () => {
  const reference = fabric({});

  it('accepts the same fibers with each percentage within 10 points', () => {
    const candidates = [
      fabric({ id: 'within', composition: '55 % poliéster, 45 % algodón' }),
      fabric({ id: 'outside', composition: '54 % poliéster, 46 % algodón' }),
    ];
    expect(ids(findCompatibleFabrics(reference, candidates))).toEqual(['within']);
  });

  it('rejects a different set of fibers', () => {
    const candidates = [
      fabric({ id: 'extra-fiber', composition: '63 % poliéster, 35 % algodón, 2 % elastano' }),
      fabric({ id: 'other-fiber', composition: '65 % poliéster, 35 % lana' }),
    ];
    expect(findCompatibleFabrics(reference, candidates)).toEqual([]);
  });

  it('accepts a weight within ±10 % of the reference, both ends included', () => {
    const candidates = [
      fabric({ id: 'low-edge', weightGsm: 220.5 }),
      fabric({ id: 'high-edge', weightGsm: 269.5 }),
      fabric({ id: 'too-light', weightGsm: 220 }),
      fabric({ id: 'too-heavy', weightGsm: 270 }),
    ];
    expect(ids(findCompatibleFabrics(reference, candidates))).toEqual(['low-edge', 'high-edge']);
  });

  it('excludes the reference itself and discontinued fabrics', () => {
    const candidates = [
      fabric({ id: 'ref' }),
      fabric({ id: 'discontinued', status: 'Descatalogado' }),
      fabric({ id: 'in-review', status: 'En revisión' }),
    ];
    expect(ids(findCompatibleFabrics(reference, candidates))).toEqual(['in-review']);
  });

  it('returns nothing when the reference composition cannot be read', () => {
    const unreadable = fabric({ composition: 'mezcla' });
    expect(findCompatibleFabrics(unreadable, [fabric({ id: 'other' })])).toEqual([]);
  });
});

describe('findCompatibleTrims', () => {
  const trim = (overrides: Partial<TrimCandidate>): TrimCandidate => ({
    id: 'ref',
    type: 'Botón',
    status: 'Activo',
    ...overrides,
  });

  it('accepts only trims of the same type that are not discontinued', () => {
    const candidates = [
      trim({ id: 'ref' }),
      trim({ id: 'same-type' }),
      trim({ id: 'other-type', type: 'Cremallera' }),
      trim({ id: 'discontinued', status: 'Descatalogado' }),
    ];
    expect(ids(findCompatibleTrims(trim({}), candidates))).toEqual(['same-type']);
  });
});
