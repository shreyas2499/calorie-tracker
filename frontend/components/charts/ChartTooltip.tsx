import type { ReactNode } from "react";
import { formatLongDate } from "@/lib/dates";

interface TooltipRow {
  label: string;
  value: string;
}

export function TooltipShell({
  date,
  rows,
  footer,
}: {
  date: string;
  rows: TooltipRow[];
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-ink">{formatLongDate(date)}</p>
      <dl className="space-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-medium tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-1.5 border-t border-line pt-1.5">{footer}</div> : null}
    </div>
  );
}
