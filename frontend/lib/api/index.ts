/** Typed API surface used by the pages and components. */
import { downloadUrl, request, requestData } from "@/lib/api/client";
import type {
  CalorieEntry,
  CalorieEntryPayload,
  CalorieSeries,
  Dashboard,
  MaintenanceHistoryRow,
  MaintenanceSummary,
  PaginatedResponse,
  Profile,
  ProfilePayload,
  ProgressSummary,
  WeightEntry,
  WeightEntryPayload,
  WeightSeries,
} from "@/types";

export interface RangeQuery {
  range?: string;
  start_date?: string;
  end_date?: string;
  today?: string;
}

export interface ListQuery extends RangeQuery {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: "asc" | "desc";
  all?: boolean;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  getProfile: () => requestData<Profile>("/profile"),
  createProfile: (body: ProfilePayload) =>
    requestData<Profile>("/profile", { method: "POST", body }),
  updateProfile: (body: ProfilePayload) =>
    requestData<Profile>("/profile", { method: "PUT", body }),

  getMaintenance: () => requestData<MaintenanceSummary>("/maintenance"),
  recalculateMaintenance: (manual?: number | null) =>
    requestData<MaintenanceSummary>("/maintenance/recalculate", {
      method: "POST",
      body: { manual_maintenance_calories: manual ?? null },
    }),
  getMaintenanceHistory: () => requestData<MaintenanceHistoryRow[]>("/maintenance/history"),

  getDashboard: (query: { today: string; range_days?: number }) =>
    requestData<Dashboard>("/dashboard", { query }),

  getCalorieSeries: (query: RangeQuery) =>
    requestData<CalorieSeries>("/analytics/calories", { query }),
  getWeightSeries: (query: RangeQuery) =>
    requestData<WeightSeries>("/analytics/weight", { query }),
  getSummary: (query: RangeQuery) => requestData<ProgressSummary>("/analytics/summary", { query }),

  listCalorieEntries: (query: ListQuery) =>
    request<PaginatedResponse<CalorieEntry>>("/calorie-entries", { query }),
  getCalorieEntryByDate: (date: string) =>
    requestData<CalorieEntry | null>(`/calorie-entries/by-date/${date}`),
  saveCalorieEntryByDate: (date: string, body: CalorieEntryPayload) =>
    requestData<CalorieEntry>(`/calorie-entries/by-date/${date}`, { method: "PUT", body }),
  updateCalorieEntry: (id: number, body: CalorieEntryPayload) =>
    requestData<CalorieEntry>(`/calorie-entries/${id}`, { method: "PUT", body }),
  deleteCalorieEntry: (id: number) =>
    requestData<{ deleted: boolean }>(`/calorie-entries/${id}`, { method: "DELETE" }),
  calorieExportUrl: (query: RangeQuery) => downloadUrl("/calorie-entries/export", { ...query }),

  listWeightEntries: (query: ListQuery) =>
    request<PaginatedResponse<WeightEntry>>("/weight-entries", { query }),
  getWeightEntryByDate: (date: string) =>
    requestData<WeightEntry | null>(`/weight-entries/by-date/${date}`),
  saveWeightEntryByDate: (date: string, body: WeightEntryPayload) =>
    requestData<WeightEntry>(`/weight-entries/by-date/${date}`, { method: "PUT", body }),
  updateWeightEntry: (id: number, body: WeightEntryPayload) =>
    requestData<WeightEntry>(`/weight-entries/${id}`, { method: "PUT", body }),
  deleteWeightEntry: (id: number) =>
    requestData<{ deleted: boolean }>(`/weight-entries/${id}`, { method: "DELETE" }),
  weightExportUrl: (query: RangeQuery) => downloadUrl("/weight-entries/export", { ...query }),
};

export { ApiError } from "@/lib/api/client";
