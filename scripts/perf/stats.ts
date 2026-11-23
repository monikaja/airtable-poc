/** PRD non-functional requirement: impact analysis in under 3 seconds with the demo volume. */
export const PERF_TARGET_MS = 3000;

export interface PerfSummary {
  count: number;
  /** The first request usually pays for the cold start and the Airtable read (cache miss). */
  firstMs: number;
  medianMs: number;
  /** Nearest-rank 95th percentile. */
  p95Ms: number;
  maxMs: number;
  /** True when every request, including the first, stays within PERF_TARGET_MS. */
  meetsTarget: boolean;
}

export function summarize(timesMs: number[]): PerfSummary {
  if (timesMs.length === 0) throw new Error('No hay mediciones.');
  const sorted = [...timesMs].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  const medianMs = sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[Math.floor(middle)]!;
  const p95Ms = sorted[Math.ceil(0.95 * sorted.length) - 1]!;
  const maxMs = sorted[sorted.length - 1]!;
  return { count: timesMs.length, firstMs: timesMs[0]!, medianMs, p95Ms, maxMs, meetsTarget: maxMs <= PERF_TARGET_MS };
}
