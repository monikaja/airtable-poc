import { describe, expect, it } from 'vitest';
import { PERF_TARGET_MS, summarize } from '../scripts/perf/stats';

describe('summarize', () => {
  it('reports the first request apart, then median, p95 and max of all requests', () => {
    const times = [2100, 120, 90, 110, 100, 95, 105, 130, 98, 102];
    expect(summarize(times)).toEqual({ count: 10, firstMs: 2100, medianMs: 103.5, p95Ms: 2100, maxMs: 2100, meetsTarget: true });
  });

  it(`fails the ${PERF_TARGET_MS} ms target when any request is slower`, () => {
    expect(summarize([3200, 150, 140]).meetsTarget).toBe(false);
    expect(summarize([3000, 150, 140]).meetsTarget).toBe(true);
  });

  it('uses the nearest-rank p95', () => {
    const times = Array.from({ length: 20 }, (_, index) => (index + 1) * 10); // 10..200
    expect(summarize(times).p95Ms).toBe(190);
  });

  it('refuses an empty run', () => {
    expect(() => summarize([])).toThrow('No hay mediciones.');
  });
});
