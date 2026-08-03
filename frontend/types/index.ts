/** Shared API request/response types. Mirrors the Flask serializers. */

export type UnitSystem = "metric" | "imperial";
export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export type BalanceStatus = "deficit" | "surplus" | "at_maintenance" | "no_data";

export interface Profile {
  id: number;
  name: string;
  email: string | null;
  age: number;
  sex: Sex;
  preferred_unit_system: UnitSystem;
  activity_level: ActivityLevel;
  activity_level_label: string;
  height_cm: number;
  height_feet: number;
  height_inches: number;
  current_weight_kg: number;
  current_weight: number;
  calculated_maintenance_calories: number;
  manual_maintenance_calories: number | null;
  active_maintenance_calories: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfilePayload {
  name: string;
  email?: string | null;
  age: number;
  sex: Sex;
  preferred_unit_system: UnitSystem;
  activity_level: ActivityLevel;
  height?: number | null;
  height_feet?: number | null;
  height_inches?: number | null;
  weight: number;
  manual_maintenance_calories?: number | null;
}

export interface MaintenanceSummary {
  bmr: number;
  calculated_maintenance_calories: number;
  manual_maintenance_calories: number | null;
  active_maintenance_calories: number;
  is_manual_override: boolean;
  activity_level: ActivityLevel;
  activity_level_label: string;
  activity_multiplier: number;
  current_weight_kg: number;
  last_recalculated_at: string | null;
  last_recalculated_date: string | null;
}

export interface MaintenanceHistoryRow {
  id: number;
  effective_date: string;
  calculated_maintenance_calories: number;
  manual_maintenance_calories: number | null;
  active_maintenance_calories: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  created_at: string | null;
}

export interface CalorieEntry {
  id: number;
  user_id: number;
  entry_date: string;
  calories_consumed: number;
  calories_burned: number;
  net_calories: number;
  maintenance_calories: number;
  calorie_balance: number;
  estimated_weight_change_kg: number;
  status: BalanceStatus;
  status_label: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CalorieEntryPayload {
  entry_date?: string;
  calories_consumed: number;
  calories_burned: number;
  notes?: string | null;
}

export interface WeightEntry {
  id: number;
  user_id: number;
  entry_date: string;
  morning_weight_kg: number | null;
  evening_weight_kg: number | null;
  average_weight_kg: number;
  morning_weight: number | null;
  evening_weight: number | null;
  average_weight: number;
  unit_system: UnitSystem;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WeightEntryPayload {
  entry_date?: string;
  morning_weight?: number | null;
  evening_weight?: number | null;
  unit_system?: UnitSystem;
  notes?: string | null;
}

export interface CaloriePoint {
  date: string;
  calories_consumed: number | null;
  calories_burned: number | null;
  net_calories: number | null;
  maintenance_calories: number | null;
  calorie_balance: number | null;
  status: BalanceStatus;
  status_label: string;
}

export interface CalorieSeries {
  start_date: string;
  end_date: string;
  points: CaloriePoint[];
  tracked_days: number;
  total_days: number;
}

export interface WeightPoint {
  date: string;
  morning_weight: number | null;
  evening_weight: number | null;
  average_weight: number | null;
  rolling_average_7d: number | null;
  average_weight_kg: number | null;
}

export interface WeightSeries {
  start_date: string;
  end_date: string;
  unit_system: UnitSystem;
  unit_label: string;
  points: WeightPoint[];
  tracked_days: number;
  total_days: number;
}

export interface ProgressSummary {
  start_date: string;
  end_date: string;
  unit_system: UnitSystem;
  unit_label: string;
  starting_average_weight: number | null;
  latest_average_weight: number | null;
  /** Dates of the first/last weight readings, which are not the window bounds. */
  starting_weight_date: string | null;
  latest_weight_date: string | null;
  total_weight_change: number | null;
  total_weight_change_kg: number | null;
  percent_weight_change: number | null;
  average_calories_consumed: number | null;
  average_calories_burned: number | null;
  average_net_calories: number | null;
  average_calorie_balance: number | null;
  average_balance_status: BalanceStatus;
  average_balance_label: string;
  calorie_tracked_days: number;
  weight_tracked_days: number;
  tracked_days: number;
  missing_days: number;
  total_days: number;
  current_streak: number;
  longest_streak: number;
  summary_text: string;
}

export interface Dashboard {
  date: string;
  unit_system: UnitSystem;
  unit_label: string;
  active_maintenance_calories: number;
  today_calories: CalorieEntry | null;
  today_weight: WeightEntry | null;
  latest_weight: { date: string; average_weight: number } | null;
  period: ProgressSummary;
  range_days: number;
  calorie_series: CalorieSeries;
  weight_series: WeightSeries;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
