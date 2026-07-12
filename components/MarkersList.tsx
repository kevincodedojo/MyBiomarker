"use client";

import { useState } from "react";
import Link from "next/link";
import StatusPill from "@/components/StatusPill";
import { readingStatus, formatValue } from "@/lib/status";
import type { Category, ReadingWithType } from "@/lib/types";

const filters: { label: string; value: Category | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Metabolic", value: "metabolic" },
  { label: "Heart", value: "heart" },
  { label: "Glucose", value: "glucose" },
  { label: "Inflammation", value: "inflammation" },
];

export default function MarkersList({ readings }: { readings: ReadingWithType[] }) {
  const [filter, setFilter] = useState<Category | "all">("all");

  const visible =
    filter === "all"
      ? readings
      : readings.filter((r) => r.biomarker_types.category === filter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter by category">
        {filters.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-foreground text-background"
                : "border border-edge text-fg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 pt-16 text-center">
          <p className="text-fg-secondary">No readings yet.</p>
          <Link
            href="/add"
            className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg"
          >
            + Log your first result
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-edge/50">
          {visible.map((r) => {
            const t = r.biomarker_types;
            const status = readingStatus(t, r.value, r.value_2);
            return (
              <li key={r.id}>
                <Link
                  href={`/markers/${t.slug}`}
                  className="flex items-center gap-3 py-3.5"
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-optimal-dim text-xs font-bold text-optimal"
                  >
                    {t.short_code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {formatValue(r.value, r.value_2)} {t.unit} ·{" "}
                      {new Date(r.tested_at + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </span>
                  <StatusPill status={status} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
