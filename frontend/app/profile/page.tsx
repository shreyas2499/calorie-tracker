"use client";

import { useState } from "react";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { api } from "@/lib/api";
import { formatCalories, formatWeight } from "@/lib/units";
import { useApiResource } from "@/lib/hooks/useApiResource";
import type { MaintenanceSummary, Profile } from "@/types";

export default function ProfilePage() {
  const [reloadKey, setReloadKey] = useState(0);

  const profileResource = useApiResource<Profile | null>(
    () => api.getProfile().catch((error) => {
      if (error?.isMissingProfile) return null;
      throw error;
    }),
    [reloadKey],
  );

  const maintenanceResource = useApiResource<MaintenanceSummary | null>(
    () => api.getMaintenance().catch((error) => {
      if (error?.isMissingProfile) return null;
      throw error;
    }),
    [reloadKey],
  );

  const loading = profileResource.loading || maintenanceResource.loading;
  const error = profileResource.error ?? maintenanceResource.error;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your details drive the maintenance-calorie calculation."
      />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={4} />
        </div>
      ) : error ? (
        <ErrorNotice message={error.message} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <Card>
            <CardHeader
              title={profileResource.data ? "Your details" : "Create your profile"}
              description="Heights are stored in centimetres and weights in kilograms."
            />
            <ProfileForm
              profile={profileResource.data}
              onSaved={() => setReloadKey((value) => value + 1)}
            />
          </Card>

          <Card>
            <CardHeader title="Maintenance calories" description="Mifflin-St Jeor estimate." />
            {maintenanceResource.data ? (
              <MaintenancePanel summary={maintenanceResource.data} />
            ) : (
              <p className="text-sm text-muted">
                Save your profile to see your estimated maintenance calories.
              </p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function MaintenancePanel({ summary }: { summary: MaintenanceSummary }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Estimated BMR", value: `${Math.round(summary.bmr).toLocaleString()} kcal` },
    {
      label: "Calculated maintenance",
      value: formatCalories(summary.calculated_maintenance_calories),
    },
    {
      label: "Manual override",
      value:
        summary.manual_maintenance_calories != null
          ? formatCalories(summary.manual_maintenance_calories)
          : "Not set",
    },
    { label: "Active target", value: formatCalories(summary.active_maintenance_calories) },
    {
      label: "Activity level",
      value: `${summary.activity_level_label} (×${summary.activity_multiplier})`,
    },
    { label: "Current weight", value: formatWeight(summary.current_weight_kg, "metric") },
    { label: "Last recalculated", value: summary.last_recalculated_date ?? "—" },
  ];

  return (
    <>
      <dl className="divide-y divide-line text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-medium tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        {summary.is_manual_override
          ? "Your manual target is in use. Clear the field on the left to return to the calculated value."
          : "The calculated value updates whenever your weight, height, age, sex or activity level changes."}
      </p>
    </>
  );
}
