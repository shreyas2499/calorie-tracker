"use client";

import { TextField } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";

export interface RangeState {
  range: string;
  start_date?: string;
  end_date?: string;
}

interface RangeFilterProps {
  value: RangeState;
  onChange: (value: RangeState) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}

const CUSTOM = "custom";

export function RangeFilter({ value, onChange, options }: RangeFilterProps) {
  const isCustom = value.range === CUSTOM;

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Date range" className="flex flex-wrap gap-1.5">
        {[...options, { value: CUSTOM, label: "Custom" }].map((option) => {
          const active = value.range === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() =>
                onChange(
                  option.value === CUSTOM
                    ? { range: CUSTOM, start_date: value.start_date, end_date: value.end_date }
                    : { range: option.value },
                )
              }
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-surface text-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {isCustom ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="From"
            type="date"
            value={value.start_date ?? ""}
            onChange={(event) => onChange({ ...value, start_date: event.target.value })}
          />
          <TextField
            label="To"
            type="date"
            value={value.end_date ?? ""}
            onChange={(event) => onChange({ ...value, end_date: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Converts the filter state into API query parameters. */
export function toRangeQuery(value: RangeState): {
  range?: string;
  start_date?: string;
  end_date?: string;
} {
  if (value.range === CUSTOM) {
    return { start_date: value.start_date || undefined, end_date: value.end_date || undefined };
  }
  return { range: value.range };
}
