"use client";

import { useMemo, useState } from "react";
import { CalorieChart } from "@/components/charts/CalorieChart";
import { WeightChart } from "@/components/charts/WeightChart";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CalorieEntryForm } from "@/components/forms/CalorieEntryForm";
import { WeightEntryForm } from "@/components/forms/WeightEntryForm";
import { MissingProfileNotice } from "@/components/layout/MissingProfileNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { CardSkeleton, ChartSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { api } from "@/lib/api";
import { formatLongDate, localToday } from "@/lib/dates";
import { useApiResource } from "@/lib/hooks/useApiResource";

export default function DashboardPage() {
  // The date is the browser's local date and is always sent explicitly.
  const [today] = useState(() => localToday());
  const rangeDays = 30;

  const { data, loading, error, reload } = useApiResource(
    () => api.getDashboard({ today, range_days: rangeDays }),
    [today, rangeDays],
  );

  const heading = useMemo(() => formatLongDate(today), [today]);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description={heading} />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <ChartSkeleton />
        </div>
      </>
    );
  }

  if (error?.isMissingProfile) {
    return (
      <>
        <PageHeader title="Dashboard" description={heading} />
        <MissingProfileNotice />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" description={heading} />
        <ErrorNotice
          message={error?.message ?? "The dashboard could not be loaded."}
          action={
            <button
              type="button"
              onClick={reload}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium"
            >
              Try again
            </button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description={heading} />

      <div className="space-y-4">
        <SummaryCards dashboard={data} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Today's calories" description="Saving updates today's entry." />
            <CalorieEntryForm date={today} entry={data.today_calories} onSaved={reload} />
          </Card>

          <Card>
            <CardHeader title="Today's weight" description="Morning and evening are independent." />
            <WeightEntryForm
              date={today}
              entry={data.today_weight}
              unitSystem={data.unit_system}
              onSaved={reload}
            />
          </Card>
        </div>

        <Card>
          <CardHeader title={`Calories · last ${rangeDays} days`} />
          <CalorieChart series={data.calorie_series} />
        </Card>

        <Card>
          <CardHeader title={`Weight · last ${rangeDays} days`} />
          <WeightChart series={data.weight_series} />
        </Card>

        <p className="px-1 text-xs text-muted">
          Estimated weight change is a rough arithmetic figure based on roughly 7,700 kcal per kg.
          It is not medical advice and will not match actual weight changes exactly.
        </p>
      </div>
    </>
  );
}
