import type { ExperimentResult } from "./types.ts";

export function percentiles(
  data: number[],
): { p05: number; p50: number; p95: number } {
  data.sort((a, b) => a - b);
  const p05 = data[Math.floor(0.05 * data.length)];
  const p50 = data[Math.floor(0.5 * data.length)];
  const p95 = data[Math.floor(0.95 * data.length)];
  return { p05, p50, p95 };
}

export function mean(data: number[]): number {
  const total = data.reduce((acc, val) => acc + val, 0);
  return total / data.length;
}

export function stdev(data: number[]): number {
  const m = mean(data);
  const squaredDiffs = data.map((x) => Math.pow(x - m, 2));
  return Math.sqrt(mean(squaredDiffs));
}

export function analyse(label: string, data: number[]): ExperimentResult {
  return {
    label,
    samples: data.length,
    ...percentiles(data),
    mean: mean(data),
    stdev: stdev(data),
  };
}
