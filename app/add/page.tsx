"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import type { z } from "zod";
import { readingInput, type ReadingInput } from "@/lib/schemas";
import type { BiomarkerType } from "@/lib/types";

// zod's coerce fields have `unknown` inputs, so the form is typed on the
// schema's input shape and handleSubmit receives the parsed output shape.
type FormValues = z.input<typeof readingInput>;

const today = () => new Date().toISOString().slice(0, 10);

export default function AddPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<BiomarkerType[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, ReadingInput>({
    resolver: zodResolver(readingInput),
    defaultValues: { tested_at: today() },
  });

  useEffect(() => {
    createClient()
      .from("biomarker_types")
      .select("*")
      .order("name")
      .then(({ data, error }) => {
        if (error) setServerError(error.message);
        else setCatalog((data as BiomarkerType[]) ?? []);
      });
  }, []);

  const selected = catalog.find((t) => t.id === Number(watch("biomarker_id")));

  async function onSubmit(input: ReadingInput) {
    setServerError(null);
    if (selected?.has_secondary && input.value_2 == null) {
      setServerError("Enter both systolic and diastolic values.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("readings").insert({
      user_id: user!.id,
      biomarker_id: input.biomarker_id,
      value: input.value,
      value_2: selected?.has_secondary ? input.value_2 : null,
      tested_at: input.tested_at,
      source: input.source || null,
      notes: input.notes || null,
    });

    if (error) {
      setServerError(
        error.code === "23505"
          ? "You already logged this biomarker for that date."
          : error.message,
      );
      return;
    }
    router.push(`/markers/${selected!.slug}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Log biomarker</h1>
        <p className="text-sm text-fg-secondary">Enter your latest lab result</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Field label="Biomarker" error={errors.biomarker_id?.message}>
          <select
            {...register("biomarker_id")}
            defaultValue=""
            className="w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          >
            <option value="" disabled>
              Select a biomarker…
            </option>
            {catalog.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.unit})
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={selected?.has_secondary ? "Systolic" : "Value"}
          suffix={selected?.unit}
          error={errors.value?.message}
        >
          <input
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="Enter value"
            {...register("value")}
            className="w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
        </Field>

        {selected?.has_secondary && (
          <Field label="Diastolic" suffix={selected.unit} error={errors.value_2?.message}>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="Enter value"
              {...register("value_2")}
              className="w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
            />
          </Field>
        )}

        <Field label="Date of test" error={errors.tested_at?.message}>
          <input
            type="date"
            max={today()}
            {...register("tested_at")}
            className="w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent [color-scheme:dark]"
          />
        </Field>

        <Field label="Lab/source (optional)" error={errors.source?.message}>
          <input
            type="text"
            placeholder="e.g. Quest Diagnostics"
            {...register("source")}
            className="w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
        </Field>

        <Field label="Notes (optional)" error={errors.notes?.message}>
          <textarea
            rows={3}
            placeholder="Fasting 12 hours…"
            {...register("notes")}
            className="w-full rounded-xl border border-edge bg-surface px-4 py-3 text-base outline-none focus:border-accent"
          />
        </Field>

        {serverError && (
          <p role="alert" className="rounded-xl bg-high-dim px-4 py-3 text-sm text-high">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Save result"}
        </button>
        <Link
          href="/add/import"
          className="rounded-xl bg-surface-raised py-3.5 text-center text-sm font-semibold"
        >
          Upload CSV instead
        </Link>
      </form>
    </div>
  );
}

function Field({
  label,
  suffix,
  error,
  children,
}: {
  label: string;
  suffix?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span>
        {label}
        {suffix && <span className="ml-2 text-fg-muted">({suffix})</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="text-xs font-normal text-high">
          {error}
        </span>
      )}
    </label>
  );
}
