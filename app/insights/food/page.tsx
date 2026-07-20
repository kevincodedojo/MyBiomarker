import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBundle } from "@/lib/ai/insights";
import type { ReadingWithType } from "@/lib/types";

export default async function FoodSuggestionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase.from("readings").select("*, biomarker_types(*)");
  const readings = (data as ReadingWithType[]) ?? [];
  const bundle = await getBundle(supabase, user!.id, readings);

  if (!bundle) redirect("/insights");
  const { food } = bundle;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/insights"
        className="self-start rounded-lg bg-insight px-4 py-2 text-sm font-semibold text-optimal"
      >
        &lt; Back
      </Link>

      <section>
        <h1 className="text-xl font-bold">Key Foods to Incorporate:</h1>
        <ul className="mt-3 flex flex-col gap-3">
          {food.key_foods.map((f) => (
            <li key={f.group} className="text-sm leading-relaxed text-fg-secondary">
              <span className="font-semibold text-foreground">{f.group}:</span> {f.examples}{" "}
              ({f.why})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold">Foods to Avoid/Limit:</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {food.avoid.map((f) => (
            <li key={f.item} className="text-sm leading-relaxed text-fg-secondary">
              <span className="font-semibold text-foreground">{f.item}:</span> {f.guidance}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-insight p-4">
        <p className="text-sm font-semibold">Featured Dish:</p>
        <h2 className="text-lg font-bold">{food.featured_dish.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{food.featured_dish.why}</p>
      </section>

      <section aria-labelledby="recipe-heading">
        <h2 id="recipe-heading" className="text-xl font-bold">
          {food.featured_dish.name}
        </h2>
        <ol className="mt-3 flex flex-col gap-4">
          {food.featured_dish.steps.map((s, i) => (
            <li key={s.title}>
              <p className="text-sm font-semibold text-accent">
                {i + 1} {s.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{s.instruction}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="pb-2 text-center text-xs text-fg-muted">
        For informational purposes only — not medical advice.
      </p>
    </div>
  );
}
