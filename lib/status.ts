import type { BiomarkerType, RangeSegment, Status } from "./types";

const SEVERITY: Record<Status, number> = { optimal: 0, borderline: 1, high: 2 };

/** Find the segment a value falls in. Segments use [min, max) with null = open end. */
export function classify(value: number, segments: RangeSegment[]): RangeSegment {
  const match = segments.find(
    (s) => (s.min === null || value >= s.min) && (s.max === null || value < s.max),
  );
  // Segments are seeded to cover the whole number line; fall back to the last
  // segment so malformed catalog data degrades visibly instead of crashing.
  return match ?? segments[segments.length - 1];
}

/** Status of a reading; for dual-value markers (BP) the worse of the two wins. */
export function readingStatus(
  type: BiomarkerType,
  value: number,
  value2?: number | null,
): Status {
  const primary = classify(value, type.ranges.primary).status;
  if (type.has_secondary && value2 != null && type.ranges.secondary) {
    const secondary = classify(value2, type.ranges.secondary).status;
    return SEVERITY[secondary] > SEVERITY[primary] ? secondary : primary;
  }
  return primary;
}

/** Distance from a value to the optimal band (0 when inside it). */
export function distanceToOptimal(value: number, segments: RangeSegment[]): number {
  const optimal = segments.find((s) => s.status === "optimal");
  if (!optimal) return 0;
  if (optimal.min !== null && value < optimal.min) return optimal.min - value;
  if (optimal.max !== null && value >= optimal.max) return value - optimal.max;
  return 0;
}

/**
 * Detail-view delta: percent change vs. previous reading, colored by whether
 * the value moved toward the optimal band, not simply up or down.
 */
export function delta(
  latest: number,
  previous: number,
  segments: RangeSegment[],
): { pct: number; improving: boolean } {
  const pct = previous === 0 ? 0 : ((latest - previous) / previous) * 100;
  const improving =
    distanceToOptimal(latest, segments) <= distanceToOptimal(previous, segments);
  return { pct, improving };
}

/** Display string for a reading value, e.g. "92" or "142/90". */
export function formatValue(value: number, value2?: number | null): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return value2 != null ? `${fmt(value)}/${fmt(value2)}` : fmt(value);
}
