export default function ComingSoon({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="flex flex-col items-center gap-2 pt-24 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-fg-muted">Coming in {milestone} — see spec.md</p>
    </div>
  );
}
