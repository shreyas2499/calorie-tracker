"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipShell } from "@/components/charts/ChartTooltip";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShortDate } from "@/lib/dates";
import type { WeightPoint, WeightSeries } from "@/types";

const SERIES = [
  { key: "morning_weight", name: "Morning", colour: "#2563eb" },
  { key: "evening_weight", name: "Evening", colour: "#7c3aed" },
  { key: "average_weight", name: "Daily average", colour: "#0f766e" },
  { key: "rolling_average_7d", name: "7-day average", colour: "#b45309", dashed: true },
] as const;

/** Above this many tracked days, point markers become visual noise. */
const DOT_THRESHOLD = 31;

function WeightTooltip({
  active,
  payload,
  unitLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeightPoint }>;
  unitLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const format = (value: number | null) => (value == null ? "—" : `${value.toFixed(1)} ${unitLabel}`);

  return (
    <TooltipShell
      date={point.date}
      rows={[
        { label: "Morning", value: format(point.morning_weight) },
        { label: "Evening", value: format(point.evening_weight) },
        { label: "Daily average", value: format(point.average_weight) },
        { label: "7-day average", value: format(point.rolling_average_7d) },
      ]}
    />
  );
}

export function WeightChart({ series }: { series: WeightSeries }) {
  // A line through a single point draws nothing, so show markers when sparse.
  const dot = series.tracked_days <= DOT_THRESHOLD ? { r: 2.5 } : false;

  if (!series.tracked_days) {
    return (
      <EmptyState
        title="No weight entries in this range"
        description="Save a weight entry to see the trend here."
      />
    );
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series.points} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11 }}
            minTickGap={24}
            stroke="rgb(var(--muted))"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="rgb(var(--muted))"
            width={56}
            domain={["dataMin - 1", "dataMax + 1"]}
            tickFormatter={(value: number) => value.toFixed(1)}
          />
          <Tooltip content={<WeightTooltip unitLabel={series.unit_label} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
