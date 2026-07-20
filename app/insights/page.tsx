import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBundle } from "@/lib/ai/insights";
import AskAI from "@/components/AskAI";
import type { ReadingWithType } from "@/lib/types";

export default async function InsightsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase.from("readings").select("*, biomarker_types(*)");
  const readings = (data as ReadingWithType[]) ?? [];

  if (readings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 pt-16 text-center">
        <h1 className="text-2xl font-bold">AI insights</h1>
        <p className="text-sm text-fg-secondary">
          Log a few biomarker results and personalized insights will appear here.
        </p>
        <Link
          href="/add"
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg"
        >
          + Log your first result
        </Link>
      </div>
    );
  }

  const bundle = await getBundle(supabase, user!.id, readings);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">AI insights</h1>
        <p className="text-sm text-fg-secondary">
          Personalized recommendations based on your data
        </p>
      </div>

      {!bundle ? (
        <p role="alert" className="rounded-xl bg-insight p-4 text-sm text-fg-secondary">
          Insights couldn&apos;t be generated right now — check back shortly.
        </p>
      ) : (
        <>
          {bundle.alerts.map((a) => (
            <section key={a.headline} className="rounded-xl bg-insight p-4">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <span
                  aria-hidden
                  className={`size-2 rounded-full ${a.severity === "warning" ? "bg-high" : "bg-optimal"}`}
                />
                {a.headline}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{a.body}</p>
            </section>
          ))}

          <section className="rounded-xl bg-surface p-4">
            <h2 className="text-base font-semibold">{bundle.food.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
              {bundle.food.summary}
            </p>
            <Link
              href="/insights/food"
              className="mt-3 inline-block rounded-lg bg-insight px-4 py-2 text-sm font-semibold text-optimal"
            >
              Learn more &gt;
            </Link>
          </section>

          <section className="rounded-xl bg-surface p-4">
            <h2 className="text-base font-semibold">{bundle.exercise.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
              {bundle.exercise.summary}
            </p>
            <Link
              href="/insights/exercise"
              className="mt-3 inline-block rounded-lg bg-insight px-4 py-2 text-sm font-semibold text-optimal"
            >
              Learn more &gt;
            </Link>
          </section>
        </>
      )}

      <AskAI />

      <p className="pb-2 text-center text-xs text-fg-muted">
        For informational purposes only — not medical advice.
      </p>
    </div>
  );
}
