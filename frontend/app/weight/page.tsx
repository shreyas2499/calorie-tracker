"use client";

import { useCallback, useEffect, useState } from "react";
import { RangeFilter, toRangeQuery, type RangeState } from "@/components/charts/RangeFilter";
import { WeightChart } from "@/components/charts/WeightChart";
import { WeightEntryForm } from "@/components/forms/WeightEntryForm";
import { MissingProfileNotice } from "@/components/layout/MissingProfileNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoryFilters } from "@/components/tables/HistoryFilters";
import { WeightHistoryTable } from "@/components/tables/WeightHistoryTable";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { RANGE_OPTIONS_WITH_ALL, localToday } from "@/lib/dates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { PaginatedResponse, WeightEntry } from "@/types";

export default function WeightPage() {
  const { notify } = useToast();
  const [today] = useState(() => localToday());
  const [range, setRange] = useState<RangeState>({ range: "30d" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<WeightEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WeightEntry | null>(null);
  const [listVersion, setListVersion] = useState(0);

  const query = { ...toRangeQuery(range), today };
  const queryKey = JSON.stringify(query);
  const isAllTime = range.range === "all";

  useEffect(() => setPage(1), [queryKey, search, sort]);

  const series = useApiResource(() => api.getWeightSeries(query), [queryKey]);

  const list = useApiResource<PaginatedResponse<WeightEntry>>(
    () =>
      api.listWeightEntries({
        ...query,
        page,
        per_page: 25,
        search,
        sort,
        all: isAllTime || undefined,
      }),
    [queryKey, page, search, sort, listVersion, isAllTime],
  );

  const unitSystem = series.data?.unit_system ?? "metric";

  const refresh = useCallback(() => {
    setListVersion((value) => value + 1);
    series.reload();
  }, [series]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.deleteWeightEntry(pendingDelete.id);
      notify(`Entry for ${pendingDelete.entry_date} deleted.`);
      refresh();
    } catch (error) {
      notify(error instanceof ApiError ? error.message : "Could not delete the entry.", "error");
    } finally {
      setPendingDelete(null);
    }
  };

  if (series.error?.isMissingProfile || list.error?.isMissingProfile) {
    return (
      <>
        <PageHeader title="Weight" />
        <MissingProfileNotice />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Weight" description="Trends and full entry history." />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Weight trend" description="Includes a 7-day rolling average." />
          <div className="space-y-4">
            <RangeFilter value={range} onChange={setRange} options={RANGE_OPTIONS_WITH_ALL} />
            {series.loading ? (
              <ChartSkeleton />
            ) : series.error ? (
              <ErrorNotice message={series.error.message} />
            ) : series.data ? (
              <WeightChart series={series.data} />
            ) : null}
          </div>
        </Card>

        {editing ? (
          <Card>
            <CardHeader
              title={`Edit entry · ${editing.entry_date}`}
              description="Saving replaces the entry for that date."
            />
            <WeightEntryForm
              date={editing.entry_date}
              entry={editing}
              unitSystem={unitSystem}
              showDateField
              submitLabel="Save changes"
              onCancel={() => setEditing(null)}
              onSaved={() => {
                setEditing(null);
                refresh();
              }}
            />
          </Card>
        ) : null}

        <Card>
          <CardHeader title="History" />
          <div className="space-y-4">
            <HistoryFilters
              range={range}
              onRangeChange={setRange}
              search={search}
              onSearchChange={setSearch}
              sort={sort}
              onSortChange={setSort}
              options={RANGE_OPTIONS_WITH_ALL}
              exportHref={api.weightExportUrl(toRangeQuery(range))}
            />
            {list.loading ? (
              <CardSkeleton rows={5} />
            ) : list.error ? (
              <ErrorNotice message={list.error.message} />
            ) : list.data ? (
              <WeightHistoryTable
                entries={list.data.items}
                pagination={list.data.pagination}
                unitSystem={unitSystem}
                onPageChange={setPage}
                onEdit={setEditing}
                onDelete={setPendingDelete}
              />
            ) : null}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this entry?"
        description={`The weight entry for ${pendingDelete?.entry_date ?? ""} will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
