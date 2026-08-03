import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "@/components/ui/Toast";

/** Renders a component inside the providers the app supplies at runtime. */
export function renderWithProviders(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

export const sampleCalorieEntry = {
  id: 1,
  user_id: 1,
  entry_date: "2026-07-15",
  calories_consumed: 2200,
  calories_burned: 500,
  net_calories: 1700,
  maintenance_calories: 2759,
  calorie_balance: -1059,
  estimated_weight_change_kg: -0.1375,
  status: "deficit" as const,
  status_label: "Deficit",
  notes: "long walk",
  created_at: null,
  updated_at: null,
};

export const sampleWeightEntry = {
  id: 1,
  user_id: 1,
  entry_date: "2026-07-15",
  morning_weight_kg: 79.0,
  evening_weight_kg: 79.8,
  average_weight_kg: 79.4,
  morning_weight: 79.0,
  evening_weight: 79.8,
  average_weight: 79.4,
  unit_system: "metric" as const,
  notes: null,
  created_at: null,
  updated_at: null,
};

export const sampleProfile = {
  id: 1,
  name: "Shreyas",
  email: null,
  age: 30,
  sex: "male" as const,
  preferred_unit_system: "metric" as const,
  activity_level: "moderately_active" as const,
  activity_level_label: "Moderately active",
  height_cm: 180,
  height_feet: 5,
  height_inches: 10.9,
  current_weight_kg: 80,
  current_weight: 80,
  calculated_maintenance_calories: 2759,
  manual_maintenance_calories: null,
  active_maintenance_calories: 2759,
  created_at: null,
  updated_at: null,
};
