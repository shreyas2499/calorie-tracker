"use client";

import { RangeFilter, type RangeState } from "@/components/charts/RangeFilter";
import { TextField } from "@/components/ui/Field";

interface HistoryFiltersProps {
  range: RangeState;
  onRangeChange: (value: RangeState) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: "asc" | "desc";
  onSortChange: (value: "asc" | "desc") => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  exportHref: string;
}

export function HistoryFilters({
  range,
  onRangeChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  options,
  exportHref,
}: HistoryFiltersProps) {
  return (
    <div className="space-y-4">
      <RangeFilter value={range} onChange={onRangeChange} options={options} />
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <TextField
          label="Search notes"
          type="search"
          placeholder="e.g. rest day"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="space-y-1.5">
          <label htmlFor="sort-order" className="block text-sm font-medium text-ink">
            Sort by date
          </label>
          <select
            id="sort-order"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as "asc" | "desc")}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        <a
          href={exportHref}
          className="inline-flex h-[38px] items-center justify-center rounded-xl border border-line px-4 text-sm font-medium text-ink hover:bg-line/40"
        >
          Export CSV
        </a>
      </div>
    </div>
  );
}
