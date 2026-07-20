import type { BiomarkerType } from "./types";

// Pure CSV-row validation for the import flow. PapaParse produces the raw
// records client-side; this module turns them into insertable readings or
// per-row error messages. Kept UI-free so it's unit-testable.

export interface CsvRecord {
  biomarker?: string;
  value?: string;
  value_2?: string;
  date?: string;
  lab?: string;
  notes?: string;
}

export interface ValidRow {
  line: number;
  biomarker_id: number;
  marker_name: string;
  value: number;
  value_2: number | null;
  tested_at: string;
  source: string | null;
  notes: string | null;
}

export interface InvalidRow {
  line: number;
  raw: CsvRecord;
  error: string;
}

export const CSV_COLUMNS = ["biomarker", "value", "value_2", "date", "lab", "notes"] as const;

/** Accepts YYYY-MM-DD or M/D/YYYY; returns ISO date or null. */
export function normalizeDate(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : trimmed;
  }
  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return Number.isNaN(new Date(iso + "T00:00:00").getTime()) ? null : iso;
  }
  return null;
}

function findMarker(name: string, catalog: BiomarkerType[]): BiomarkerType | undefined {
  const needle = name.trim().toLowerCase();
  return catalog.find(
    (t) =>
      t.slug === needle ||
      t.name.toLowerCase() === needle ||
      t.short_code.toLowerCase() === needle,
  );
}

const PLAUSIBLE_MAX = 10000; // generous upper bound to catch unit mix-ups / typos

export function validateRecords(
  records: CsvRecord[],
  catalog: BiomarkerType[],
): { valid: ValidRow[]; invalid: InvalidRow[] } {
  const valid: ValidRow[] = [];
  const invalid: InvalidRow[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set<string>();

  records.forEach((raw, i) => {
    const line = i + 2; // 1-based + header row
    const fail = (error: string) => invalid.push({ line, raw, error });

    const name = raw.biomarker?.trim();
    if (!name) return fail("Missing biomarker name");
    const marker = findMarker(name, catalog);
    if (!marker) return fail(`Unknown biomarker "${name}"`);

    const value = Number(raw.value);
    if (!raw.value?.trim() || !Number.isFinite(value) || value <= 0) {
      return fail("Value must be a positive number");
    }
    if (value > PLAUSIBLE_MAX) return fail(`Value ${value} looks implausible`);

    let value2: number | null = null;
    if (marker.has_secondary) {
      value2 = Number(raw.value_2);
      if (!raw.value_2?.trim() || !Number.isFinite(value2) || value2 <= 0) {
        return fail(`${marker.name} needs a second value (e.g. diastolic)`);
      }
    }

    const date = normalizeDate(raw.date ?? "");
    if (!date) return fail("Date must be YYYY-MM-DD or M/D/YYYY");
    if (date > today) return fail("Date can't be in the future");

    const dupKey = `${marker.id}|${date}`;
    if (seen.has(dupKey)) return fail(`Duplicate row for ${marker.name} on ${date}`);
    seen.add(dupKey);

    valid.push({
      line,
      biomarker_id: marker.id,
      marker_name: marker.name,
      value,
      value_2: value2,
      tested_at: date,
      source: raw.lab?.trim() || null,
      notes: raw.notes?.trim() || null,
    });
  });

  return { valid, invalid };
}
