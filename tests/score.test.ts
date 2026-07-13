import { describe, expect, it } from "vitest";
import { categoryLabel, computeHealth, latestPerMarker } from "../lib/score";
import type { BiomarkerType, ReadingWithType } from "../lib/types";

// Minimal catalog mirroring db/schema.sql shapes
function marker(
  id: number,
  category: BiomarkerType["category"],
  ranges: BiomarkerType["ranges"]["primary"],
): BiomarkerType {
  return {
    id,
    slug: `marker_${id}`,
    name: `Marker ${id}`,
    short_code: `M${id}`,
    unit: "mg/dL",
    category,
    has_secondary: false,
    ranges: { primary: ranges, secondary: null },
  };
}

const glucoseRanges: BiomarkerType["ranges"]["primary"] = [
  { label: "Optimal", status: "optimal", min: null, max: 100 },
  { label: "Borderline", status: "borderline", min: 100, max: 126 },
  { label: "High", status: "high", min: 126, max: null },
];

const glucose = marker(1, "glucose", glucoseRanges);
const trig = marker(2, "metabolic", glucoseRanges);
const ldl = marker(3, "heart", glucoseRanges);

let seq = 0;
function reading(
  type: BiomarkerType,
  value: number,
  tested_at: string,
): ReadingWithType {
  seq += 1;
  return {
    id: `r${seq}`,
    user_id: "u1",
    biomarker_id: type.id,
    value,
    value_2: null,
    tested_at,
    source: null,
    notes: null,
    created_at: `2026-07-12T00:00:${String(seq).padStart(2, "0")}Z`,
    biomarker_types: type,
  };
}

describe("latestPerMarker", () => {
  it("keeps only the newest reading per marker", () => {
    const old = reading(glucose, 130, "2026-05-01");
    const newer = reading(glucose, 92, "2026-07-01");
    const latest = latestPerMarker([newer, old]);
    expect(latest).toHaveLength(1);
    expect(latest[0].value).toBe(92);
  });

  it("breaks same-day ties by created_at", () => {
    const first = reading(glucose, 95, "2026-07-01");
    const second = reading(glucose, 99, "2026-07-01"); // created later
    expect(latestPerMarker([first, second])[0].value).toBe(99);
  });
});

describe("categoryLabel thresholds", () => {
  it("matches spec §4.2 boundaries", () => {
    expect(categoryLabel(0.75)).toBe("Good");
    expect(categoryLabel(0.74)).toBe("Fair");
    expect(categoryLabel(0.5)).toBe("Fair");
    expect(categoryLabel(0.49)).toBe("Needs work");
  });
});

describe("computeHealth", () => {
  it("returns null score with no readings", () => {
    expect(computeHealth([]).score).toBeNull();
  });

  it("scores optimal=1, borderline=0.5, high=0 from latest readings only", () => {
    const rs = [
      reading(glucose, 92, "2026-07-01"),  // optimal   → 1
      reading(trig, 110, "2026-07-01"),    // borderline → 0.5
      reading(ldl, 140, "2026-07-01"),     // high      → 0
      reading(ldl, 92, "2026-01-01"),      // old optimal LDL must be ignored
    ];
    const h = computeHealth(rs);
    expect(h.score).toBe(50); // mean(1, 0.5, 0) = 0.5
  });

  it("summarizes categories with optimal counts", () => {
    const rs = [
      reading(glucose, 92, "2026-07-01"),
      reading(trig, 110, "2026-07-01"),
    ];
    const h = computeHealth(rs);
    expect(h.categories.glucose).toMatchObject({ label: "Good", optimal: 1, tracked: 1 });
    expect(h.categories.metabolic).toMatchObject({ label: "Fair", optimal: 0, tracked: 1 });
    expect(h.categories.heart).toBeUndefined(); // never logged → excluded
  });
});
