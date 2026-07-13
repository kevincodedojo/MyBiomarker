import { readingStatus } from "./status";
import type { Category, ReadingWithType, Status } from "./types";

// Spec §4.2: optimal = 1.0, borderline = 0.5, high (or low) = 0.0,
// computed from each marker's latest reading only.
const STATUS_SCORE: Record<Status, number> = { optimal: 1, borderline: 0.5, high: 0 };

export const CATEGORY_ORDER: Category[] = ["metabolic", "heart", "glucose", "inflammation"];

export type CategoryLabel = "Good" | "Fair" | "Needs work";

export interface CategorySummary {
  pct: number;        // mean marker score in this category, 0..1
  label: CategoryLabel;
  optimal: number;    // markers whose latest reading is optimal
  tracked: number;    // markers with at least one reading
}

export interface HealthSummary {
  /** null when the user has no readings at all */
  score: number | null;
  categories: Partial<Record<Category, CategorySummary>>;
}

/** Newest reading per marker; ties on tested_at broken by created_at. */
export function latestPerMarker(readings: ReadingWithType[]): ReadingWithType[] {
  const byMarker = new Map<number, ReadingWithType>();
  for (const r of readings) {
    const current = byMarker.get(r.biomarker_id);
    if (
      !current ||
      r.tested_at > current.tested_at ||
      (r.tested_at === current.tested_at && r.created_at > current.created_at)
    ) {
      byMarker.set(r.biomarker_id, r);
    }
  }
  return [...byMarker.values()];
}

export function categoryLabel(pct: number): CategoryLabel {
  if (pct >= 0.75) return "Good";
  if (pct >= 0.5) return "Fair";
  return "Needs work";
}

export function computeHealth(readings: ReadingWithType[]): HealthSummary {
  const latest = latestPerMarker(readings);
  if (latest.length === 0) return { score: null, categories: {} };

  const scores: number[] = [];
  const byCategory = new Map<Category, { scores: number[]; optimal: number }>();

  for (const r of latest) {
    const status = readingStatus(r.biomarker_types, r.value, r.value_2);
    const s = STATUS_SCORE[status];
    scores.push(s);

    const cat = r.biomarker_types.category;
    const bucket = byCategory.get(cat) ?? { scores: [], optimal: 0 };
    bucket.scores.push(s);
    if (status === "optimal") bucket.optimal += 1;
    byCategory.set(cat, bucket);
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  const categories: Partial<Record<Category, CategorySummary>> = {};
  for (const [cat, { scores: catScores, optimal }] of byCategory) {
    const pct = mean(catScores);
    categories[cat] = {
      pct,
      label: categoryLabel(pct),
      optimal,
      tracked: catScores.length,
    };
  }

  return { score: Math.round(100 * mean(scores)), categories };
}
