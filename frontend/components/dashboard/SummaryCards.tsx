import { SummaryCard, SummaryGrid } from "@/components/dashboard/SummaryCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBalance, formatCalories, formatSignedWeight, formatWeight } from "@/lib/units";
import type { Dashboard } from "@/types";

const NO_DATA = "No data recorded";

export function SummaryCards({ dashboard }: { dashboard: Dashboard }) {
  const { today_calories: calories, today_weight: weight, period, unit_system: units } = dashboard;

  return (
    <SummaryGrid>
      <SummaryCard
        label="Consumed today"
        value={calories ? formatCalories(calories.calories_consumed) : NO_DATA}
      />
      <SummaryCard
        label="Burned today"
        value={calories ? formatCalories(calories.calories_burned) : NO_DATA}
      />
      <SummaryCard
        label="Net calories"
        value={calories ? formatCalories(calories.net_calories) : NO_DATA}
        hint={calories ? "Consumed minus burned" : undefined}
      />
      <SummaryCard
        label="Maintenance target"
        value={formatCalories(dashboard.active_maintenance_calories)}
      />
      <SummaryCard
        label="Balance today"
        value={calories ? formatBalance(calories.calorie_balance) : NO_DATA}
        badge={
          calories ? (
            <StatusBadge status={calories.status} label={calories.status_label} />
          ) : (
            <StatusBadge status="no_data" label={NO_DATA} />
          )
        }
        hint={
          calories
            ? `Est. ${calories.estimated_weight_change_kg.toFixed(3)} kg theoretical change (estimate only)`
            : undefined
        }
      />
      <SummaryCard
        label="Morning weight"
        value={weight?.morning_weight != null ? formatWeight(weight.morning_weight, units) : NO_DATA}
      />
      <SummaryCard
        label="Evening weight"
        value={weight?.evening_weight != null ? formatWeight(weight.evening_weight, units) : NO_DATA}
      />
      <SummaryCard
        label="Average today"
        value={weight ? formatWeight(weight.average_weight, units) : NO_DATA}
      />
      <SummaryCard
        label="Latest weight"
        value={
          dashboard.latest_weight
            ? formatWeight(dashboard.latest_weight.average_weight, units)
            : NO_DATA
        }
        hint={dashboard.latest_weight ? `Recorded ${dashboard.latest_weight.date}` : undefined}
      />
      <SummaryCard
        label={`Weight change (${dashboard.range_days}d)`}
        value={
          period.total_weight_change != null
            ? formatSignedWeight(period.total_weight_change, units)
            : NO_DATA
        }
        hint={
          period.percent_weight_change != null
            ? `${period.percent_weight_change > 0 ? "+" : ""}${period.percent_weight_change}%`
            : undefined
        }
      />
      <SummaryCard
        label={`Avg. balance (${dashboard.range_days}d)`}
        value={
          period.average_calorie_balance != null
            ? formatBalance(period.average_calorie_balance)
            : NO_DATA
        }
        badge={
          <StatusBadge status={period.average_balance_status} label={period.average_balance_label} />
        }
      />
      <SummaryCard
        label="Tracking streak"
        value={`${period.current_streak} day${period.current_streak === 1 ? "" : "s"}`}
        hint={`Longest: ${period.longest_streak}`}
      />
    </SummaryGrid>
  );
}
