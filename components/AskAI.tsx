"use client";

import { useState } from "react";

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Something went wrong.");
      else setAnswer(json.answer);
    } catch {
      setError("Network error — please try again.");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-fg"
      >
        Ask AI a health question
      </button>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-surface p-4">
      <h2 className="text-base font-semibold">Ask AI a health question</h2>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <textarea
          rows={3}
          required
          maxLength={500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What does my glucose trend mean?"
          className="rounded-xl border border-edge bg-background px-4 py-3 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || question.trim().length === 0}
          className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-high-dim px-4 py-3 text-sm text-high">
          {error}
        </p>
      )}
      {answer && (
        <div className="rounded-xl bg-insight p-4">
          {answer.split("\n\n").map((para, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-fg-secondary first:mt-0">
              {para}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
