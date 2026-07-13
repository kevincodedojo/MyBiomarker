export default function ScoreRing({ score }: { score: number | null }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const filled = score === null ? 0 : score / 100;
  return (
    <div
      className="relative"
      role="img"
      aria-label={score === null ? "No health score yet" : `Health score ${score} out of 100`}
    >
      <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden>
        <circle cx="75" cy="75" r={r} fill="none" stroke="var(--surface-raised)" strokeWidth="9" />
        {score !== null && (
          <circle
            cx="75"
            cy="75"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - filled)}
            transform="rotate(-90 75 75)"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold">{score ?? "—"}</span>
        <span className="text-xs text-fg-secondary">
          Health
          <br />
          score
        </span>
      </div>
    </div>
  );
}
