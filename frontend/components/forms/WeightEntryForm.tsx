"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { applyApiError } from "@/components/forms/formError";
import { Button } from "@/components/ui/Button";
import { NumberField, TextAreaField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { weightUnitLabel } from "@/lib/units";
import { weightEntrySchema, type WeightFormValues } from "@/lib/validation/schemas";
import type { UnitSystem, WeightEntry } from "@/types";

interface WeightEntryFormProps {
  date: string;
  entry?: WeightEntry | null;
  unitSystem: UnitSystem;
  showDateField?: boolean;
  submitLabel?: string;
  onSaved?: (entry: WeightEntry) => void;
  onCancel?: () => void;
}

export function WeightEntryForm({
  date,
  entry,
  unitSystem,
  showDateField = false,
  submitLabel = "Save weight",
  onSaved,
  onCancel,
}: WeightEntryFormProps) {
  const { notify } = useToast();
  const unit = weightUnitLabel(unitSystem);

  const defaults = (): WeightFormValues => ({
    entry_date: entry?.entry_date ?? date,
    morning_weight: entry?.morning_weight ?? "",
    evening_weight: entry?.evening_weight ?? "",
    notes: entry?.notes ?? "",
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WeightFormValues>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: defaults(),
  });

  useEffect(() => {
    reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, date, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    const values = weightEntrySchema.parse(raw);
    try {
      const saved = await api.saveWeightEntryByDate(values.entry_date, {
        morning_weight: values.morning_weight ?? null,
        evening_weight: values.evening_weight ?? null,
        unit_system: unitSystem,
        notes: values.notes || null,
      });
      notify(`Weight for ${saved.entry_date} saved.`);
      onSaved?.(saved);
    } catch (error) {
      notify(
        applyApiError(error, setError, {
          morning_weight_kg: "morning_weight",
          evening_weight_kg: "evening_weight",
        }),
        "error",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {showDateField ? (
        <TextField label="Date" type="date" error={errors.entry_date?.message} {...register("entry_date")} />
      ) : (
        <input type="hidden" {...register("entry_date")} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Morning weight"
          suffix={unit}
          step={0.1}
          min={0}
          placeholder="After waking up"
          error={errors.morning_weight?.message}
          {...register("morning_weight")}
        />
        <NumberField
          label="Evening weight"
          suffix={unit}
          step={0.1}
          min={0}
          placeholder="Before sleeping"
          error={errors.evening_weight?.message}
          {...register("evening_weight")}
        />
      </div>

      <TextAreaField
        label="Notes"
        placeholder="Optional"
        maxLength={1000}
        error={errors.notes?.message}
        {...register("notes")}
      />

      <p className="text-xs text-muted">
        Enter either reading on its own — the daily average uses whichever values are present.
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
