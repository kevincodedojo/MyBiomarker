import { describe, expect, it } from "vitest";
import { classify, delta, distanceToOptimal, formatValue, readingStatus } from "../lib/status";
import type { BiomarkerType, RangeSegment } from "../lib/types";

// Mirrors the seeded fasting-glucose ranges in db/schema.sql
const glucose: RangeSegment[] = [
  { label: "Low", status: "high", min: null, max: 70 },
  { label: "Optimal 70-100", status: "optimal", min: 70, max: 100 },
  { label: "Pre-diabetes", status: "borderline", min: 100, max: 126 },
  { label: "High >126", status: "high", min: 126, max: null },
];

const bp: BiomarkerType = {
  id: 6,
  slug: "blood_pressure",
  name: "Blood pressure",
  short_code: "BP",
  unit: "mmHg",
  category: "heart",
  has_secondary: true,
  ranges: {
    primary: [
      { label: "Optimal <120", status: "optimal", min: null, max: 120 },
      { label: "Elevated", status: "borderline", min: 120, max: 140 },
      { label: "High ≥140", status: "high", min: 140, max: null },
    ],
    secondary: [
      { label: "Optimal <80", status: "optimal", min: null, max: 80 },
      { label: "Elevated", status: "borderline", min: 80, max: 90 },
      { label: "High ≥90", status: "high", min: 90, max: null },
    ],
  },
};

describe("classify", () => {
  it("places values in the correct segment", () => {
    expect(classify(92, glucose).status).toBe("optimal");
    expect(classify(110, glucose).status).toBe("borderline");
    expect(classify(140, glucose).status).toBe("high");
    expect(classify(60, glucose).label).toBe("Low");
  });

  it("treats boundaries as [min, max)", () => {
    expect(classify(70, glucose).status).toBe("optimal");   // low edge inclusive
    expect(classify(100, glucose).status).toBe("borderline"); // high edge exclusive
    expect(classify(126, glucose).status).toBe("high");
  });
});

describe("readingStatus (blood pressure)", () => {
  it("uses the worse of systolic/diastolic", () => {
    expect(readingStatus(bp, 118, 75)).toBe("optimal");
    expect(readingStatus(bp, 118, 92)).toBe("high");     // diastolic wins
    expect(readingStatus(bp, 142, 75)).toBe("high");     // systolic wins
    expect(readingStatus(bp, 125, 85)).toBe("borderline");
  });
});

describe("distanceToOptimal", () => {
  it("is zero inside the band and grows outside it", () => {
    expect(distanceToOptimal(85, glucose)).toBe(0);
    expect(distanceToOptimal(110, glucose)).toBe(10);
    expect(distanceToOptimal(65, glucose)).toBe(5);
  });
});

describe("delta", () => {
  it("marks movement toward optimal as improving even when value drops", () => {
    const d = delta(92, 98, glucose);
    expect(Math.round(d.pct)).toBe(-6); // matches the Figma "▼6% from last test"
    expect(d.improving).toBe(true);
  });

  it("marks movement away from optimal as not improving", () => {
    const d = delta(112, 98, glucose);
    expect(d.improving).toBe(false);
  });

  it("moving below the optimal band is not improving", () => {
    const d = delta(60, 75, glucose);
    expect(d.improving).toBe(false);
  });
});

describe("formatValue", () => {
  it("formats single and dual values", () => {
    expect(formatValue(92)).toBe("92");
    expect(formatValue(142, 90)).toBe("142/90");
    expect(formatValue(5.68)).toBe("5.7");
  });
});
