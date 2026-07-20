import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { insightsBundle, markerInsight, type InsightsBundle, type MarkerInsight } from "./schemas";
import { readingStatus, formatValue } from "@/lib/status";
import type { BiomarkerType, ReadingWithType } from "@/lib/types";

const MODEL = "claude-sonnet-5";

const SYSTEM = `You are the health-insights writer inside MyBiomarker, a personal biomarker tracking app.
You receive a user's self-logged lab results and produce educational, encouraging, plain-language analysis.

Hard rules:
- Educational tone only. You are not a clinician and never diagnose conditions, name diseases the user "has", or give medication advice.
- Ground every statement in the provided readings; never invent values or trends.
- Where relevant, recommend confirming with a healthcare professional.
- If data suggests a medical emergency (e.g. extremely high blood pressure), say clearly that they should seek medical care promptly.
- Use the same units as the provided data. Keep language specific and actionable (foods, activities, timeframes).`;

/** Compact, deterministic text snapshot of the user's readings for the model. */
export function snapshot(readings: ReadingWithType[]): string {
  const byMarker = new Map<number, ReadingWithType[]>();
  for (const r of readings) {
    const list = byMarker.get(r.biomarker_id) ?? [];
    list.push(r);
    byMarker.set(r.biomarker_id, list);
  }
  const lines: string[] = [];
  for (const list of byMarker.values()) {
    const sorted = [...list].sort((a, b) => (a.tested_at < b.tested_at ? -1 : 1));
    const t = sorted[0].biomarker_types;
    const latest = sorted[sorted.length - 1];
    const status = readingStatus(t, latest.value, latest.value_2);
    const history = sorted
      .slice(-6)
      .map((r) => `${r.tested_at}: ${formatValue(r.value, r.value_2)}`)
      .join(", ");
    lines.push(
      `${t.name} (${t.unit}, category ${t.category}) — latest status: ${status}. Readings: ${history}`,
    );
  }
  return lines.sort().join("\n");
}

/** Stable hash of the readings a generation was based on. */
export function dataHash(readings: ReadingWithType[]): string {
  const stable = readings
    .map((r) => `${r.biomarker_id}|${r.value}|${r.value_2 ?? ""}|${r.tested_at}`)
    .sort()
    .join(";");
  return createHash("sha256").update(stable).digest("hex").slice(0, 32);
}

async function generate<T>(schema: z.ZodType<T>, prompt: string, maxTokens: number): Promise<T | null> {
  const client = new Anthropic();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(schema) },
      });
      if (response.parsed_output) return response.parsed_output;
    } catch (err) {
      console.error(`insight generation failed (attempt ${attempt + 1})`, err);
    }
  }
  return null;
}

type Supabase = SupabaseClient;

async function cached<T>(
  supabase: Supabase,
  userId: string,
  scope: string,
  hash: string,
): Promise<T | null> {
  const { data } = await supabase
    .from("insights")
    .select("content, data_hash")
    .eq("user_id", userId)
    .eq("scope", scope)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data && data.data_hash === hash ? (data.content as T) : null;
}

async function store(
  supabase: Supabase,
  userId: string,
  scope: string,
  hash: string,
  content: unknown,
): Promise<void> {
  await supabase.from("insights").delete().eq("user_id", userId).eq("scope", scope);
  await supabase.from("insights").insert({ user_id: userId, scope, content, data_hash: hash });
}

/** Read-only cache lookup — used by Home so it never blocks on generation. */
export async function getCachedBundle(
  supabase: Supabase,
  userId: string,
  readings: ReadingWithType[],
): Promise<InsightsBundle | null> {
  if (readings.length === 0) return null;
  return cached<InsightsBundle>(supabase, userId, "bundle", dataHash(readings));
}

/** Get the insights-tab bundle, generating (and caching) if stale or missing. */
export async function getBundle(
  supabase: Supabase,
  userId: string,
  readings: ReadingWithType[],
): Promise<InsightsBundle | null> {
  if (readings.length === 0) return null;
  const hash = dataHash(readings);
  const hit = await cached<InsightsBundle>(supabase, userId, "bundle", hash);
  if (hit) return hit;

  const prompt = `Here are the user's logged biomarker readings:

${snapshot(readings)}

Produce the insights bundle:
- "overview": the single most useful takeaway right now (headline + 2-3 sentence body).
- "alerts": one entry per marker whose latest status is borderline or high (severity "warning"), plus at most one "info" entry celebrating a positive trend if there is one. Explain each in plain language with a concrete next step.
- "food": diet suggestions targeted at the worst-status markers (title should name the concern, e.g. "Food Suggestions for Hypertension"). 4-6 key food groups with examples and why, 3-4 things to avoid or limit with concrete guidance, and one featured dish with 4-5 numbered preparation steps.
- "exercise": an exercise plan for the same concern: 3-4 general recommendations (intensity, consistency, warm-up, listening to your body) and a progressive plan with week_1, month_1, and month_3 stages.
If everything is optimal, make the bundle congratulatory and maintenance-focused.`;

  const result = await generate(insightsBundle, prompt, 8000);
  if (result) await store(supabase, userId, "bundle", hash, result);
  return result;
}

/** Get the per-marker Detail-view insight, generating (and caching) if stale. */
export async function getMarkerInsight(
  supabase: Supabase,
  userId: string,
  type: BiomarkerType,
  markerReadings: ReadingWithType[],
): Promise<MarkerInsight | null> {
  if (markerReadings.length === 0) return null;
  const scope = `marker:${type.slug}`;
  const hash = dataHash(markerReadings);
  const hit = await cached<MarkerInsight>(supabase, userId, scope, hash);
  if (hit) return hit;

  const ranges = type.ranges.primary
    .map((s) => `${s.label} (${s.status}): ${s.min ?? "-∞"} to ${s.max ?? "∞"}`)
    .join("; ");
  const prompt = `Reference ranges for ${type.name} (${type.unit}): ${ranges}

The user's readings for this marker:

${snapshot(markerReadings)}

Produce the marker insight:
- "trend_summary": 2-3 sentences describing the trend across their readings and what it suggests, citing actual values.
- "recommendation": one concrete, actionable suggestion appropriate to the current status.
- "retest_window": a suggested retest timeframe such as "4-6 weeks".`;

  const result = await generate(markerInsight, prompt, 4000);
  if (result) await store(supabase, userId, scope, hash, result);
  return result;
}

const ASK_DAILY_LIMIT = 20;

export async function askAI(
  supabase: Supabase,
  userId: string,
  readings: ReadingWithType[],
  question: string,
): Promise<{ answer: string } | { error: string; status: number }> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("insights")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("scope", "ask")
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= ASK_DAILY_LIMIT) {
    return { error: "Daily question limit reached — try again tomorrow.", status: 429 };
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `The user's logged biomarker readings:\n\n${snapshot(readings) || "(none logged yet)"}\n\nTheir question: ${question}\n\nAnswer in 2-5 short paragraphs of plain language, grounded in their data where relevant. End with a one-line reminder that this is educational information, not medical advice.`,
        },
      ],
    });
    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) return { error: "No answer generated — please try again.", status: 502 };

    await supabase.from("insights").insert({
      user_id: userId,
      scope: "ask",
      content: { question, answer: text },
      data_hash: "",
    });
    return { answer: text };
  } catch (err) {
    console.error("ask AI failed", err);
    return { error: "Something went wrong answering your question.", status: 502 };
  }
}
