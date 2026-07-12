export type Status = "optimal" | "borderline" | "high";

export type Category = "metabolic" | "heart" | "glucose" | "inflammation";

export interface RangeSegment {
  label: string;
  status: Status;
  /** null = open-ended (no lower bound) */
  min: number | null;
  /** null = open-ended (no upper bound); exclusive upper edge */
  max: number | null;
}

export interface BiomarkerRanges {
  primary: RangeSegment[];
  secondary: RangeSegment[] | null;
}

export interface BiomarkerType {
  id: number;
  slug: string;
  name: string;
  short_code: string;
  unit: string;
  category: Category;
  has_secondary: boolean;
  ranges: BiomarkerRanges;
}

export interface Reading {
  id: string;
  user_id: string;
  biomarker_id: number;
  value: number;
  value_2: number | null;
  tested_at: string; // ISO date
  source: string | null;
  notes: string | null;
  created_at: string;
}

export type ReadingWithType = Reading & { biomarker_types: BiomarkerType };
