import { z } from "zod";

// Structured-output schemas for Claude generations. The API is instructed to
// return JSON matching these exactly; anything that fails validation is
// discarded and retried once (see lib/ai/insights.ts).

/** Insights-tab bundle — one generation powers the tab, the Home card, and the food/exercise screens. */
export const insightsBundle = z.object({
  overview: z.object({
    headline: z.string(),
    body: z.string(),
  }),
  alerts: z.array(
    z.object({
      marker_name: z.string(),
      headline: z.string(),      // e.g. "Blood pressure trending high"
      body: z.string(),
      severity: z.enum(["info", "warning"]),
    }),
  ),
  food: z.object({
    title: z.string(),           // e.g. "Food Suggestions for Hypertension"
    summary: z.string(),
    key_foods: z.array(z.object({ group: z.string(), examples: z.string(), why: z.string() })),
    avoid: z.array(z.object({ item: z.string(), guidance: z.string() })),
    featured_dish: z.object({
      name: z.string(),
      why: z.string(),
      steps: z.array(z.object({ title: z.string(), instruction: z.string() })),
    }),
  }),
  exercise: z.object({
    title: z.string(),           // e.g. "Exercise Plan for Hypertension"
    summary: z.string(),
    general_recs: z.array(z.object({ title: z.string(), body: z.string() })),
    plan: z.object({
      week_1: z.object({ title: z.string(), body: z.string() }),
      month_1: z.object({ title: z.string(), body: z.string() }),
      month_3: z.object({ title: z.string(), body: z.string() }),
    }),
  }),
});

export type InsightsBundle = z.infer<typeof insightsBundle>;

/** Per-marker insight shown on the Detail view. */
export const markerInsight = z.object({
  trend_summary: z.string(),
  recommendation: z.string(),
  retest_window: z.string(),     // e.g. "4-6 weeks"
});

export type MarkerInsight = z.infer<typeof markerInsight>;
