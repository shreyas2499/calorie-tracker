"use client";

import { useCallback, useEffect, useState } from "react";
import { CalorieChart } from "@/components/charts/CalorieChart";
import { RangeFilter, toRangeQuery, type RangeState } from "@/components/charts/RangeFilter";
import { CalorieEntryForm } from "@/components/forms/CalorieEntryForm";
import { MissingProfileNotice } from "@/components/layout/MissingProfileNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { CalorieHistoryTable } from "@/components/tables/CalorieHistoryTable";
import { HistoryFilters } from "@/components/tables/HistoryFilters";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { RANGE_OPTIONS, localToday } from "@/lib/dates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { CalorieEntry, PaginatedResponse } from "@/types";

export default function CaloriesPage() {
  const { notify } = useToast();
  const [today] = useState(() => localToday());
  const [range, setRange] = useState<RangeState>({ range: "30d" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CalorieEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CalorieEntry | null>(null);
  const [listVersion, setListVersion] = useState(0);

  const query = { ...toRangeQuery(range), today };
  const queryKey = JSON.stringify(query);

  useEffect(() => setPage(1), [queryKey, search, sort]);

  const series = useApiResource(() => api.getCalorieSeries(query), [queryKey]);

  const list = useApiResource<PaginatedResponse<CalorieEntry>>(
    () => api.listCalorieEntries({ ...query, page, per_page: 25, search, sort }),
    [queryKey, page, search, sort, listVersion],
  );

  const refresh = useCallback(() => {
    setListVersion((value) => value + 1);
    series.reload();
  }, [series]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.deleteCalorieEntry(pendingDelete.id);
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
        <PageHeader title="Calories" />
        <MissingProfileNotice />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Calories" description="Trends and full entry history." />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Calorie trend" />
          <div className="space-y-4">
            <RangeFilter value={range} onChange={setRange} options={RANGE_OPTIONS} />
            {series.loading ? (
              <ChartSkeleton />
            ) : series.error ? (
              <ErrorNotice message={series.error.message} />
            ) : series.data ? (
              <CalorieChart series={series.data} />
            ) : null}
          </div>
        </Card>

        {editing ? (
          <Card>
            <CardHeader
              title={`Edit entry · ${editing.entry_date}`}
              description="Saving replaces the entry for that date."
            />
            <CalorieEntryForm
              date={editing.entry_date}
              entry={editing}
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
              options={RANGE_OPTIONS}
              exportHref={api.calorieExportUrl(toRangeQuery(range))}
            />
            {list.loading ? (
              <CardSkeleton rows={5} />
            ) : list.error ? (
              <ErrorNotice message={list.error.message} />
            ) : list.data ? (
              <CalorieHistoryTable
                entries={list.data.items}
                pagination={list.data.pagination}
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
        description={`The calorie entry for ${pendingDelete?.entry_date ?? ""} will be permanently removed.`}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
