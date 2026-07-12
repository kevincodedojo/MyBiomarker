import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkerDetail from "@/components/MarkerDetail";
import type { BiomarkerType, Reading } from "@/lib/types";

export default async function MarkerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: type } = await supabase
    .from("biomarker_types")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!type) notFound();

  const { data: readings } = await supabase
    .from("readings")
    .select("*")
    .eq("biomarker_id", type.id)
    .order("tested_at", { ascending: true });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/markers"
        className="self-start rounded-lg bg-insight px-4 py-2 text-sm font-semibold text-optimal"
      >
        &lt; Biomarkers
      </Link>
      <MarkerDetail
        type={type as BiomarkerType}
        readings={(readings as Reading[]) ?? []}
      />
    </div>
  );
}
