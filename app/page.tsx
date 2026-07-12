import Link from "next/link";

// Static preview data for M0 — replaced by real readings in M1/M2.
const categories = [
  { name: "Metabolic", status: "Good", detail: "4/5 optimal", tone: "text-optimal", dot: "bg-optimal" },
  { name: "Heart", status: "Fair", detail: "2/3 optimal", tone: "text-borderline", dot: "bg-borderline" },
  { name: "Glucose", status: "Good", detail: "4/5 optimal", tone: "text-optimal", dot: "bg-optimal" },
  { name: "Inflammation", status: "Needs work", detail: "1/2 optimal", tone: "text-high", dot: "bg-high" },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-2xl font-bold">Hi, Kevin</h1>
        <p className="text-sm text-fg-secondary">Your health overview</p>
      </section>

      <section className="flex justify-center py-2" aria-label="Health score">
        <ScoreRing score={78} />
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="mb-3 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          Categories
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => (
            <div key={c.name} className="rounded-xl bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className={`size-2 rounded-full ${c.dot}`} aria-hidden />
                {c.name}
              </p>
              <p className={`mt-1 text-lg font-semibold ${c.tone}`}>{c.status}</p>
              <p className="text-xs text-fg-muted">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="insight-heading">
        <h2 id="insight-heading" className="mb-3 text-xs font-semibold tracking-wide text-fg-muted uppercase">
          Recent AI insight
        </h2>
        <div className="rounded-xl bg-insight p-4">
          <p className="text-sm font-semibold">Recommendation</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
            Your fasting glucose has improved 8% over 3 months. Keep maintaining
            your current diet pattern. Tap for more insights.
          </p>
        </div>
      </section>

      <section aria-labelledby="actions-heading" className="flex flex-col gap-3">
        <h2 id="actions-heading" className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
          Quick actions
        </h2>
        <Link
          href="/add"
          className="rounded-xl bg-accent py-3.5 text-center text-sm font-semibold text-accent-fg"
        >
          + Log new biomarker result
        </Link>
        <Link
          href="/add"
          className="rounded-xl bg-surface-raised py-3.5 text-center text-sm font-semibold"
        >
          Upload lab report (CSV)
        </Link>
      </section>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" role="img" aria-label={`Health score ${score} out of 100`}>
      <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden>
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-raised)" strokeWidth="9" />
        <circle
          cx="75"
          cy="75"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 75 75)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{score}</span>
        <span className="text-xs text-fg-secondary">
          Health
          <br />
          score
        </span>
      </div>
    </div>
  );
}
