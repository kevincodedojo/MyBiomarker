import { createClient } from "@/lib/supabase/server";
import MarkersList from "@/components/MarkersList";
import type { ReadingWithType } from "@/lib/types";

export default async function MarkersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("readings")
    .select("*, biomarker_types(*)")
    .order("tested_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="pt-16 text-center text-sm text-high">
        Couldn&apos;t load readings: {error.message}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">All Biomarkers</h1>
      <MarkersList readings={(data as ReadingWithType[]) ?? []} />
    </div>
  );
}
