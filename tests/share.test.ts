import { describe, expect, it } from 'vitest';
import { readShareState, writeShareSearch } from '../src/share';

describe('readShareState', () => {
  it('reads the material and the simulated price from the link', () => {
    expect(readShareState('?tipo=tejido&id=recF7&sim=10')).toEqual({ tipo: 'tejido', id: 'recF7', pricePct: 10 });
  });

  it('opens at the current price when the link has no simulation', () => {
    expect(readShareState('?tipo=proveedor&id=recP1')).toEqual({ tipo: 'proveedor', id: 'recP1', pricePct: 0 });
  });

  it('ignores a simulation outside −20 % to +40 % or not a whole number', () => {
    for (const sim of ['55', '-21', '7.5', 'abc']) {
      expect(readShareState(`?tipo=avio&id=recA5&sim=${sim}`)?.pricePct).toBe(0);
    }
  });

  it('opens nothing when the type or the id is missing or unknown', () => {
    for (const search of ['', '?id=recF7', '?tipo=tejido', '?tipo=prenda&id=recF7', '?tipo=tejido&id=']) {
      expect(readShareState(search)).toBeNull();
    }
  });
});

describe('writeShareSearch', () => {
  it('writes the material and, only when simulated, the price change', () => {
    expect(writeShareSearch({ tipo: 'tejido', id: 'recF7', pricePct: 10 })).toBe('?tipo=tejido&id=recF7&sim=10');
    expect(writeShareSearch({ tipo: 'tejido', id: 'recF7', pricePct: 0 })).toBe('?tipo=tejido&id=recF7');
  });

  it('writes nothing when no material is chosen', () => {
    expect(writeShareSearch(null)).toBe('');
  });

  it('round-trips with readShareState', () => {
    const state = { tipo: 'avio' as const, id: 'recA5', pricePct: -20 };
    expect(readShareState(writeShareSearch(state))).toEqual(state);
  });
});
