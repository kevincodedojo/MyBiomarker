import { describe, expect, it } from "vitest";
import { normalizeDate, validateRecords, type CsvRecord } from "../lib/csv";
import type { BiomarkerType } from "../lib/types";

const glucose: BiomarkerType = {
  id: 1,
  slug: "fasting_glucose",
  name: "Fasting glucose",
  short_code: "FG",
  unit: "mg/dL",
  category: "glucose",
  has_secondary: false,
  ranges: { primary: [], secondary: null },
};

const bp: BiomarkerType = {
  id: 6,
  slug: "blood_pressure",
  name: "Blood pressure",
  short_code: "BP",
  unit: "mmHg",
  category: "heart",
  has_secondary: true,
  ranges: { primary: [], secondary: null },
};

const catalog = [glucose, bp];

function row(overrides: CsvRecord): CsvRecord {
  return { biomarker: "Fasting glucose", value: "92", date: "2026-07-01", ...overrides };
}

describe("normalizeDate", () => {
  it("accepts ISO and US formats", () => {
    expect(normalizeDate("2026-07-01")).toBe("2026-07-01");
    expect(normalizeDate("7/1/2026")).toBe("2026-07-01");
    expect(normalizeDate("07/01/2026")).toBe("2026-07-01");
  });

  it("rejects garbage", () => {
    expect(normalizeDate("July 1st")).toBeNull();
    expect(normalizeDate("2026-13-40")).toBeNull();
  });
});

describe("validateRecords", () => {
  it("accepts marker by name, slug, or short code (case-insensitive)", () => {
    const { valid, invalid } = validateRecords(
      [row({}), row({ biomarker: "fasting_glucose", date: "2026-07-02" }), row({ biomarker: "fg", date: "2026-07-03" })],
      catalog,
    );
    expect(invalid).toHaveLength(0);
    expect(valid.map((v) => v.biomarker_id)).toEqual([1, 1, 1]);
  });

  it("requires the second value for blood pressure", () => {
    const { valid, invalid } = validateRecords(
      [row({ biomarker: "Blood pressure", value: "142" })],
      catalog,
    );
    expect(valid).toHaveLength(0);
    expect(invalid[0].error).toContain("second value");
  });

  it("accepts blood pressure with both values", () => {
    const { valid } = validateRecords(
      [row({ biomarker: "BP", value: "142", value_2: "90" })],
      catalog,
    );
    expect(valid[0]).toMatchObject({ biomarker_id: 6, value: 142, value_2: 90 });
  });

  it("rejects unknown markers, bad values, bad dates, future dates", () => {
    const { invalid } = validateRecords(
      [
        row({ biomarker: "Cholesterol Ratio" }),
        row({ value: "-5" }),
        row({ value: "99999" }),
        row({ date: "soon" }),
        row({ date: "2999-01-01" }),
      ],
      catalog,
    );
    expect(invalid).toHaveLength(5);
    expect(invalid.map((e) => e.line)).toEqual([2, 3, 4, 5, 6]);
  });

  it("flags in-file duplicates for the same marker and date", () => {
    const { valid, invalid } = validateRecords([row({}), row({})], catalog);
    expect(valid).toHaveLength(1);
    expect(invalid[0].error).toContain("Duplicate");
  });
});
