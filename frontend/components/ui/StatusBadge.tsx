import type { BalanceStatus } from "@/types";

/**
 * Status is communicated with a text label and a symbol, never colour alone.
 */
const STATUS_STYLES: Record<BalanceStatus, { symbol: string; classes: string }> = {
  deficit: { symbol: "▼", classes: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  surplus: { symbol: "▲", classes: "border-amber-300 bg-amber-50 text-amber-900" },
  at_maintenance: { symbol: "=", classes: "border-line bg-line/40 text-ink" },
  no_data: { symbol: "–", classes: "border-line bg-white text-muted" },
};

export function StatusBadge({ status, label }: { status: BalanceStatus; label: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.no_data;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.classes}`}
    >
      <span aria-hidden>{style.symbol}</span>
      {label}
    </span>
  );
}
