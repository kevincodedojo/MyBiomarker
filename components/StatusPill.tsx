import type { Status } from "@/lib/types";

const styles: Record<Status, { bg: string; fg: string; label: string }> = {
  optimal: { bg: "bg-optimal-dim", fg: "text-optimal", label: "Optimal" },
  borderline: { bg: "bg-borderline-dim", fg: "text-borderline", label: "Borderline" },
  high: { bg: "bg-high-dim", fg: "text-high", label: "High" },
};

export default function StatusPill({ status, label }: { status: Status; label?: string }) {
  const s = styles[status];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.bg} ${s.fg}`}>
      {label ?? s.label}
    </span>
  );
}
