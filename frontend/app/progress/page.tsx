"use client";

import { useState } from "react";
import { CalorieChart } from "@/components/charts/CalorieChart";
import { RangeFilter, toRangeQuery, type RangeState } from "@/components/charts/RangeFilter";
import { WeightChart } from "@/components/charts/WeightChart";
import { SummaryCard, SummaryGrid } from "@/components/dashboard/SummaryCard";
import { MissingProfileNotice } from "@/components/layout/MissingProfileNotice";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { ChartSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import { RANGE_OPTIONS_WITH_ALL, localToday } from "@/lib/dates";
import { useApiResource } from "@/lib/hooks/useApiResource";
import { formatBalance, formatCalories, formatSignedWeight, formatWeight } from "@/lib/units";

const NO_DATA = "No data recorded";

export default function ProgressPage() {
  const [today] = useState(() => localToday());
  const [range, setRange] = useState<RangeState>({ range: "30d" });

  const query = { ...toRangeQuery(range), today };
  const queryKey = JSON.stringify(query);

  const summary = useApiResource(() => api.getSummary(query), [queryKey]);
  const calories = useApiResource(() => api.getCalorieSeries(query), [queryKey]);
  const weight = useApiResource(() => api.getWeightSeries(query), [queryKey]);

  if (summary.error?.isMissingProfile) {
    return (
      <>
        <PageHeader title="Progress" />
        <MissingProfileNotice />
      </>
    );
  }

  const data = summary.data;
  const units = data?.unit_system ?? "metric";

  return (
    <>
      <PageHeader title="Progress" description="Combined calorie and weight analytics." />

      <div className="space-y-4">
        <Card>
          <CardHeader title="Date range" />
          <RangeFilter value={range} onChange={setRange} options={RANGE_OPTIONS_WITH_ALL} />
        </Card>

        {summary.loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : summary.error ? (
          <ErrorNotice message={summary.error.message} />
        ) : data ? (
          <>
            <Card>
              <CardHeader title="Summary" />
              <p className="text-sm leading-relaxed text-ink">{data.summary_text}</p>
              <p className="mt-2 text-xs text-muted">
                These figures are shown side by side for reference. Recorded weight change is not
                attributed to your calorie balance.
              </p>
            </Card>

            <SummaryGrid>
              <SummaryCard
                label="Starting average weight"
                value={
                  data.starting_average_weight != null
                    ? formatWeight(data.starting_average_weight, units)
                    : NO_DATA
                }
                hint={data.start_date}
              />
              <SummaryCard
                label="Latest average weight"
                value={
                  data.latest_average_weight != null
                    ? formatWeight(data.latest_average_weight, units)
                    : NO_DATA
                }
                hint={data.end_date}
              />
              <SummaryCard
                label="Total weight change"
                value={
                  data.total_weight_change != null
                    ? formatSignedWeight(data.total_weight_change, units)
                    : NO_DATA
                }
              />
              <SummaryCard
                label="Percentage change"
                value={
                  data.percent_weight_change != null
                    ? `${data.percent_weight_change > 0 ? "+" : ""}${data.percent_weight_change}%`
                    : NO_DATA
                }
              />
              <SummaryCard
                label="Avg. consumed"
                value={
                  data.average_calories_consumed != null
                    ? formatCalories(data.average_calories_consumed)
                    : NO_DATA
                }
              />
              <SummaryCard
                label="Avg. burned"
                value={
                  data.average_calories_burned != null
                    ? formatCalories(data.average_calories_burned)
                    : NO_DATA
                }
              />
              <SummaryCard
                label="Avg. net calories"
                value={
                  data.average_net_calories != null
                    ? formatCalories(data.average_net_calories)
                    : NO_DATA
                }
              />
              <SummaryCard
                label="Avg. balance"
                value={
                  data.average_calorie_balance != null
                    ? formatBalance(data.average_calorie_balance)
                    : NO_DATA
                }
                badge={
                  <StatusBadge
                    status={data.average_balance_status}
                    label={data.average_balance_label}
                  />
                }
              />
              <SummaryCard label="Tracked days" value={`${data.tracked_days} of ${data.total_days}`} />
              <SummaryCard label="Missing days" value={`${data.missing_days}`} />
              <SummaryCard
                label="Current streak"
                value={`${data.current_streak} day${data.current_streak === 1 ? "" : "s"}`}
              />
              <SummaryCard
                label="Longest streak"
                value={`${data.longest_streak} day${data.longest_streak === 1 ? "" : "s"}`}
              />
            </SummaryGrid>
          </>
        ) : null}

        <Card>
          <CardHeader title="Calories" />
          {calories.loading ? (
            <ChartSkeleton />
          ) : calories.error ? (
            <ErrorNotice message={calories.error.message} />
          ) : calories.data ? (
            <CalorieChart series={calories.data} showBalanceBars={false} />
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Weight" />
          {weight.loading ? (
            <ChartSkeleton />
          ) : weight.error ? (
            <ErrorNotice message={weight.error.message} />
          ) : weight.data ? (
            <WeightChart series={weight.data} />
          ) : null}
        </Card>
      </div>
    </>
  );
}
