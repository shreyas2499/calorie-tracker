"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipShell } from "@/components/charts/ChartTooltip";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShortDate } from "@/lib/dates";
import type { CaloriePoint, CalorieSeries } from "@/types";

const SERIES = [
  { key: "calories_consumed", name: "Consumed", colour: "#2563eb" },
  { key: "calories_burned", name: "Burned", colour: "#7c3aed" },
  { key: "net_calories", name: "Net", colour: "#0f766e" },
  { key: "maintenance_calories", name: "Maintenance", colour: "#b45309", dashed: true },
] as const;

/** Above this many tracked days, point markers become visual noise. */
const DOT_THRESHOLD = 31;

function CalorieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CaloriePoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const format = (value: number | null) => (value == null ? "—" : `${value.toLocaleString()} kcal`);

  return (
    <TooltipShell
      date={point.date}
      rows={[
        { label: "Consumed", value: format(point.calories_consumed) },
        { label: "Burned", value: format(point.calories_burned) },
        { label: "Net", value: format(point.net_calories) },
        { label: "Maintenance", value: format(point.maintenance_calories) },
        {
          label: "Balance",
          value:
            point.calorie_balance == null
              ? "—"
              : `${point.calorie_balance > 0 ? "+" : ""}${point.calorie_balance.toLocaleString()} kcal`,
        },
      ]}
      footer={<span className="font-medium text-ink">{point.status_label}</span>}
    />
  );
}

interface CalorieChartProps {
  series: CalorieSeries;
  showBalanceBars?: boolean;
}

export function CalorieChart({ series, showBalanceBars = true }: CalorieChartProps) {
  // A line through a single point draws nothing, so show markers whenever the
  // series is sparse. Dense series stay clean.
  const dot = series.tracked_days <= DOT_THRESHOLD ? { r: 2.5 } : false;

  if (!series.tracked_days) {
    return (
      <EmptyState
        title="No calorie entries in this range"
        description="Save a calorie entry to see the trend here."
      />
    );
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series.points} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11 }}
            minTickGap={24}
            stroke="rgb(var(--muted))"
          />
          <YAxis tick={{ fontSize: 11 }} stroke="rgb(var(--muted))" width={56} />
          <Tooltip content={<CalorieTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {showBalanceBars ? (
            <Bar
              dataKey="calorie_balance"
              name="Balance"
              fill="#94a3b8"
              barSize={10}
              radius={[2, 2, 2, 2]}
            />
          ) : null}
          {SERIES.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.colour}
              strokeWidth={2}
              strokeDasharray={"dashed" in item && item.dashed ? "5 4" : undefined}
              dot={dot}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
