import type { ReactNode } from "react";

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  badge?: ReactNode;
}

export function SummaryCard({ label, value, hint, badge }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tabular-nums text-ink">{value}</p>
      {badge ? <div className="mt-2">{badge}</div> : null}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function SummaryGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
  );
}
