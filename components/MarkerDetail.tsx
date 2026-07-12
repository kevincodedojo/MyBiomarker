"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { classify, delta, formatValue, readingStatus } from "@/lib/status";
import type { BiomarkerType, Reading, Status } from "@/lib/types";

const RANGES = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: null },
] as const;

const STATUS_VAR: Record<Status, string> = {
  optimal: "var(--optimal)",
  borderline: "var(--borderline)",
  high: "var(--high)",
};

const STATUS_TEXT: Record<Status, string> = {
  optimal: "text-optimal",
  borderline: "text-borderline",
  high: "text-high",
};

export default function MarkerDetail({
  type,
  readings, // ascending by tested_at
}: {
  type: BiomarkerType;
  readings: Reading[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]); // 3M

  if (readings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 pt-12 text-center">
        <h1 className="text-2xl font-bold">{type.name}</h1>
        <p className="text-sm text-fg-secondary">No readings logged yet.</p>
        <Link
          href="/add"
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg"
        >
          + Log your first result
        </Link>
      </div>
    );
  }

  const latest = readings[readings.length - 1];
  const previous = readings.length > 1 ? readings[readings.length - 2] : null;
  const d = previous ? delta(latest.value, previous.value, type.ranges.primary) : null;

  const cutoff = range.months
    ? new Date(new Date().setMonth(new Date().getMonth() - range.months))
        .toISOString()
        .slice(0, 10)
    : null;
  const chartData = (cutoff ? readings.filter((r) => r.tested_at >= cutoff) : readings).map(
    (r) => ({
      date: r.tested_at,
      value: r.value,
      value_2: r.value_2,
    }),
  );

  const optimal = type.ranges.primary.find((s) => s.status === "optimal");
  const activeSegment = classify(latest.value, type.ranges.primary);

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center">
        <h1 className="text-xl font-bold">{type.name}</h1>
        <p className="mt-2">
          <span className="text-4xl font-bold text-accent">
            {formatValue(latest.value, latest.value_2)}
          </span>{" "}
          <span className="text-sm text-fg-secondary">{type.unit}</span>
        </p>
        {d && previous && (
          <p className={`mt-1 text-sm font-medium ${d.improving ? "text-optimal" : "text-high"}`}>
            {d.pct > 0 ? "▲" : d.pct < 0 ? "▼" : "•"}
            {Math.abs(d.pct).toFixed(0)}% from last test
          </p>
        )}
      </section>

      <div className="flex justify-center gap-2" role="tablist" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.label}
            role="tab"
            aria-selected={range.label === r.label}
            onClick={() => setRange(r)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ${
              range.label === r.label
                ? "bg-foreground text-background"
                : "border border-edge text-fg-secondary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="h-52 rounded-xl bg-surface p-3">
        {chartData.length < 2 ? (
          <p className="flex h-full items-center justify-center text-sm text-fg-muted">
            Log at least two readings in this period to see a trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              {optimal && (
                <ReferenceArea
                  y1={optimal.min ?? undefined}
                  y2={optimal.max ?? undefined}
                  fill="var(--optimal-dim)"
                  fillOpacity={0.9}
                />
              )}
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
                tickFormatter={(v: string) =>
                  new Date(v + "T00:00:00").toLocaleDateString("en-US", { month: "short" })
                }
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--edge)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
                labelFormatter={(v) =>
                  new Date(String(v) + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ fill: "var(--accent)", r: 3 }}
                name={type.has_secondary ? "Systolic" : type.name}
              />
              {type.has_secondary && (
                <Line
                  type="monotone"
                  dataKey="value_2"
                  stroke="var(--borderline)"
                  strokeWidth={2}
                  dot={{ fill: "var(--borderline)", r: 3 }}
                  name="Diastolic"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <section aria-labelledby="range-heading">
        <h2 id="range-heading" className="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          Reference range
        </h2>
        <div className="flex gap-1">
          {type.ranges.primary.map((s) => (
            <div
              key={s.label}
              className={`h-4 flex-1 first:rounded-l-full last:rounded-r-full ${
                s === activeSegment ? "ring-2 ring-foreground" : ""
              }`}
              style={{ background: STATUS_VAR[s.status], opacity: s === activeSegment ? 1 : 0.55 }}
              title={s.label}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-fg-muted">
          {type.ranges.primary.map((s) => (
            <span key={s.label}>{s.label}</span>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-insight p-4">
        <p className="text-sm font-semibold">AI insight</p>
        <p className="mt-2 text-sm text-fg-secondary">
          Personalized trend analysis arrives in M3.
        </p>
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-1 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          History
        </h2>
        <ul className="divide-y divide-edge/50">
          {[...readings].reverse().map((r) => {
            const status = readingStatus(type, r.value, r.value_2);
            return (
              <li key={r.id} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium">
                  {new Date(r.tested_at + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {r.source && (
                    <span className="ml-2 text-xs font-normal text-fg-muted">{r.source}</span>
                  )}
                </span>
                <span className={`text-sm font-semibold ${STATUS_TEXT[status]}`}>
                  {formatValue(r.value, r.value_2)} {type.unit}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="pb-2 text-center text-xs text-fg-muted">
        For informational purposes only — not medical advice.
      </p>
    </div>
  );
}
