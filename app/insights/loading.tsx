export default function InsightsLoading() {
  return (
    <div className="flex flex-col items-center gap-3 pt-24 text-center" role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-edge border-t-accent" aria-hidden />
      <p className="text-sm text-fg-secondary">Analyzing your readings…</p>
      <p className="text-xs text-fg-muted">First visit after new data takes a few seconds.</p>
    </div>
  );
}
