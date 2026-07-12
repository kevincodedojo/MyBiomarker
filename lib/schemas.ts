import { z } from "zod";

/** Shared by the Add-entry form now and the CSV import endpoint in M4. */
export const readingInput = z
  .object({
    biomarker_id: z.coerce.number().int().positive({ message: "Choose a biomarker" }),
    value: z.coerce.number().positive({ message: "Enter a value greater than 0" }),
    value_2: z.coerce.number().positive().optional(),
    tested_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
      .refine((d) => d <= new Date().toISOString().slice(0, 10), {
        message: "Date can't be in the future",
      }),
    source: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
  });

export type ReadingInput = z.infer<typeof readingInput>;
