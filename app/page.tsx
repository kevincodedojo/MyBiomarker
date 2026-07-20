import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCachedBundle } from "@/lib/ai/insights";
import { CATEGORY_ORDER, computeHealth, type CategoryLabel } from "@/lib/score";
import ScoreRing from "@/components/ScoreRing";
import type { Category, ReadingWithType } from "@/lib/types";

const CATEGORY_NAMES: Record<Category, string> = {
  metabolic: "Metabolic",
  heart: "Heart",
  glucose: "Glucose",
  inflammation: "Inflammation",
};

const LABEL_STYLE: Record<CategoryLabel, { text: string; dot: string }> = {
  Good: { text: "text-optimal", dot: "bg-optimal" },
  Fair: { text: "text-borderline", dot: "bg-borderline" },
  "Needs work": { text: "text-high", dot: "bg-high" },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("readings")
    .select("*, biomarker_types(*)")
    .order("tested_at", { ascending: false });

  const readings = (data as ReadingWithType[]) ?? [];
  const health = computeHealth(readings);
  // Read-only cache lookup — Home never blocks on AI generation; the
  // Insights tab is where fresh bundles get generated.
  const bundle = user ? await getCachedBundle(supabase, user.id, readings) : null;

  const name = user?.email ? user.email.split("@")[0] : "there";
  const greeting = name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">Hi, {greeting}</h1>
        <p className="text-sm text-fg-secondary">Your health overview</p>
      </section>

      <section className="flex justify-center py-2" aria-label="Health score">
        <ScoreRing score={health.score} />
      </section>

      {health.score === null ? (
        <section className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-fg-secondary">
            Log your first biomarker result to see your health score.
          </p>
        </section>
      ) : (
        <section aria-labelledby="categories-heading">
          <h2
            id="categories-heading"
            className="mb-3 text-xs font-semibold tracking-wide text-fg-muted uppercase"
          >
            Categories
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORY_ORDER.map((cat) => {
              const summary = health.categories[cat];
              if (!summary) {
                return (
                  <div key={cat} className="rounded-xl bg-surface p-4 opacity-60">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="size-2 rounded-full bg-fg-muted" aria-hidden />
                      {CATEGORY_NAMES[cat]}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-fg-muted">—</p>
                    <p className="text-xs text-fg-muted">No data yet</p>
                  </div>
                );
              }
              const style = LABEL_STYLE[summary.label];
              return (
                <Link
                  key={cat}
                  href="/markers"
                  className="rounded-xl bg-surface p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className={`size-2 rounded-full ${style.dot}`} aria-hidden />
                    {CATEGORY_NAMES[cat]}
                  </p>
                  <p className={`mt-1 text-lg font-semibold ${style.text}`}>
                    {summary.label}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {summary.optimal}/{summary.tracked} optimal
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="insight-heading">
        <h2
          id="insight-heading"
          className="mb-3 text-xs font-semibold tracking-wide text-fg-muted uppercase"
        >
          Recent AI insight
        </h2>
        <Link href="/insights" className="block rounded-xl bg-insight p-4">
          <p className="text-sm font-semibold">
            {bundle ? bundle.overview.headline : "Recommendation"}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
            {bundle
              ? `${bundle.overview.body} Tap for more insights.`
              : "Visit the Insights tab to generate personalized recommendations from your readings."}
          </p>
        </Link>
      </section>

      <section aria-labelledby="actions-heading" className="flex flex-col gap-3">
        <h2
          id="actions-heading"
          className="text-xs font-semibold tracking-wide text-fg-muted uppercase"
        >
          Quick actions
        </h2>
        <Link
          href="/add"
          className="rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-fg"
        >
          + Log new biomarker result
        </Link>
        <Link
          href="/add/import"
          className="rounded-xl bg-surface-raised py-3.5 text-center text-sm font-semibold"
        >
          Upload lab report (CSV)
        </Link>
      </section>
    </div>
  );
}
