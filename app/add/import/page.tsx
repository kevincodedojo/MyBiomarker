"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { validateRecords, type CsvRecord, type InvalidRow, type ValidRow } from "@/lib/csv";
import type { BiomarkerType } from "@/lib/types";

type Preview = { valid: ValidRow[]; invalid: InvalidRow[] };

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<BiomarkerType[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .from("biomarker_types")
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCatalog((data as BiomarkerType[]) ?? []);
      });
  }, []);

  function handleFile(file: File) {
    setError(null);
    Papa.parse<CsvRecord>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        if (result.data.length === 0) {
          setError("No rows found — check the file has a header row and data.");
          setPreview(null);
          return;
        }
        setPreview(validateRecords(result.data, catalog));
      },
      error: () => setError("Couldn't read that file — is it a CSV?"),
    });
  }

  async function importRows() {
    if (!preview || preview.valid.length === 0) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: dbError } = await supabase.from("readings").upsert(
      preview.valid.map((r) => ({
        user_id: user!.id,
        biomarker_id: r.biomarker_id,
        value: r.value,
        value_2: r.value_2,
        tested_at: r.tested_at,
        source: r.source,
        notes: r.notes,
      })),
      { onConflict: "user_id,biomarker_id,tested_at" },
    );

    if (dbError) {
      setError(dbError.message);
      setBusy(false);
      return;
    }
    router.push("/markers");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Upload lab report</h1>
        <p className="text-sm text-fg-secondary">
          Import many results at once from a CSV file
        </p>
      </div>

      <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-fg-secondary">
        Columns: <code className="text-foreground">biomarker, value, value_2, date, lab, notes</code>.
        Re-importing the same marker and date updates the existing reading.{" "}
        <a href="/template.csv" download className="font-semibold text-optimal">
          Download template
        </a>
      </div>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-edge py-8 text-sm text-fg-secondary">
        <span className="font-semibold text-foreground">Choose a CSV file</span>
        or drop it here
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-high-dim px-4 py-3 text-sm text-high">
          {error}
        </p>
      )}

      {preview && (
        <section aria-labelledby="preview-heading" className="flex flex-col gap-3">
          <h2 id="preview-heading" className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
            Preview — {preview.valid.length} ready, {preview.invalid.length} with problems
          </h2>

          {preview.invalid.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-xl bg-high-dim p-4 text-sm text-high">
              {preview.invalid.map((r) => (
                <li key={r.line}>
                  Line {r.line}: {r.error}
                </li>
              ))}
            </ul>
          )}

          {preview.valid.length > 0 && (
            <div className="overflow-x-auto rounded-xl bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-edge text-xs text-fg-muted uppercase">
                    <th className="px-4 py-2.5 font-semibold">Biomarker</th>
                    <th className="px-4 py-2.5 font-semibold">Value</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/50">
                  {preview.valid.map((r) => (
                    <tr key={`${r.biomarker_id}-${r.tested_at}`}>
                      <td className="px-4 py-2.5">{r.marker_name}</td>
                      <td className="px-4 py-2.5">
                        {r.value}
                        {r.value_2 != null ? `/${r.value_2}` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-fg-secondary">{r.tested_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            disabled={busy || preview.valid.length === 0}
            onClick={importRows}
            className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {busy
              ? "Importing…"
              : `Import ${preview.valid.length} reading${preview.valid.length === 1 ? "" : "s"}`}
          </button>
        </section>
      )}

      <Link href="/add" className="text-center text-sm text-fg-secondary underline-offset-4 hover:underline">
        Enter a single result instead
      </Link>
    </div>
  );
}
