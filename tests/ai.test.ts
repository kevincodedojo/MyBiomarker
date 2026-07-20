import { describe, expect, it } from "vitest";
import { dataHash, snapshot } from "../lib/ai/insights";
import type { BiomarkerType, ReadingWithType } from "../lib/types";

const glucose: BiomarkerType = {
  id: 1,
  slug: "fasting_glucose",
  name: "Fasting glucose",
  short_code: "FG",
  unit: "mg/dL",
  category: "glucose",
  has_secondary: false,
  ranges: {
    primary: [
      { label: "Optimal", status: "optimal", min: null, max: 100 },
      { label: "High", status: "high", min: 100, max: null },
    ],
    secondary: null,
  },
};

function reading(id: string, value: number, tested_at: string): ReadingWithType {
  return {
    id,
    user_id: "u1",
    biomarker_id: 1,
    value,
    value_2: null,
    tested_at,
    source: null,
    notes: null,
    created_at: "2026-07-13T00:00:00Z",
    biomarker_types: glucose,
  };
}

describe("dataHash", () => {
  it("is stable regardless of reading order", () => {
    const a = reading("a", 92, "2026-07-12");
    const b = reading("b", 100, "2026-06-10");
    expect(dataHash([a, b])).toBe(dataHash([b, a]));
  });

  it("changes when a value changes", () => {
    const a = reading("a", 92, "2026-07-12");
    const edited = { ...a, value: 93 };
    expect(dataHash([a])).not.toBe(dataHash([edited]));
  });
});

describe("snapshot", () => {
  it("summarizes latest status and history in one line per marker", () => {
    const text = snapshot([
      reading("a", 100, "2026-06-10"),
      reading("b", 92, "2026-07-12"),
    ]);
    expect(text).toContain("Fasting glucose (mg/dL, category glucose)");
    expect(text).toContain("latest status: optimal");
    expect(text).toContain("2026-06-10: 100, 2026-07-12: 92");
  });
});
