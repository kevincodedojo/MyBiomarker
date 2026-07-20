import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBundle } from "@/lib/ai/insights";
import type { ReadingWithType } from "@/lib/types";

export default async function ExercisePlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.from("readings").select("*, biomarker_types(*)");
  const readings = (data as ReadingWithType[]) ?? [];
  const bundle = await getBundle(supabase, user!.id, readings);

  if (!bundle) redirect("/insights");
  const { exercise } = bundle;

  const stages = [
    { label: "WEEK 1", ...exercise.plan.week_1 },
    { label: "MONTH 1", ...exercise.plan.month_1 },
    { label: "3 MONTHS", ...exercise.plan.month_3 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/insights"
        className="self-start rounded-lg bg-insight px-4 py-2 text-sm font-semibold text-optimal"
      >
        &lt; Back
      </Link>

      <section>
        <h1 className="text-xl font-bold">General Recommendations:</h1>
        <ul className="mt-3 flex flex-col gap-3">
          {exercise.general_recs.map((r) => (
            <li key={r.title} className="text-sm leading-relaxed text-fg-secondary">
              <span className="font-semibold text-foreground">{r.title}:</span> {r.body}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="plan-heading" className="flex flex-col gap-5">
        <h2 id="plan-heading" className="sr-only">
          Progressive plan
        </h2>
        {stages.map((s) => (
          <div key={s.label} className="rounded-xl bg-surface p-4">
            <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
              {s.label}
            </p>
            <h3 className="mt-1 text-base font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{s.body}</p>
          </div>
        ))}
      </section>

      <p className="pb-2 text-center text-xs text-fg-muted">
        For informational purposes only — not medical advice.
      </p>
    </div>
  );
}
