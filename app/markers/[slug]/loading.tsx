export default function MarkerLoading() {
  return (
    <div className="flex flex-col items-center gap-3 pt-24 text-center" role="status">
      <span className="size-8 animate-spin rounded-full border-2 border-edge border-t-accent" aria-hidden />
      <p className="text-sm text-fg-secondary">Loading marker…</p>
    </div>
  );
}
