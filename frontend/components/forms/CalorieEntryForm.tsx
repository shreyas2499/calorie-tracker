"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { applyApiError } from "@/components/forms/formError";
import { Button } from "@/components/ui/Button";
import { NumberField, TextAreaField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { calorieEntrySchema, type CalorieFormValues } from "@/lib/validation/schemas";
import type { CalorieEntry } from "@/types";

interface CalorieEntryFormProps {
  date: string;
  entry?: CalorieEntry | null;
  /** Show the date input (history editing) or keep it fixed (dashboard). */
  showDateField?: boolean;
  submitLabel?: string;
  onSaved?: (entry: CalorieEntry) => void;
  onCancel?: () => void;
}

export function CalorieEntryForm({
  date,
  entry,
  showDateField = false,
  submitLabel = "Save calories",
  onSaved,
  onCancel,
}: CalorieEntryFormProps) {
  const { notify } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CalorieFormValues>({
    resolver: zodResolver(calorieEntrySchema),
    defaultValues: {
      entry_date: entry?.entry_date ?? date,
      calories_consumed: entry?.calories_consumed ?? "",
      calories_burned: entry?.calories_burned ?? "",
      notes: entry?.notes ?? "",
    },
  });

  // Reload the form when today's entry arrives or the selected date changes.
  useEffect(() => {
    reset({
      entry_date: entry?.entry_date ?? date,
      calories_consumed: entry?.calories_consumed ?? "",
      calories_burned: entry?.calories_burned ?? "",
      notes: entry?.notes ?? "",
    });
  }, [entry, date, reset]);

  const onSubmit = handleSubmit(async (raw) => {
    const values = calorieEntrySchema.parse(raw);
    try {
      const saved = await api.saveCalorieEntryByDate(values.entry_date, {
        calories_consumed: values.calories_consumed,
        calories_burned: values.calories_burned ?? 0,
        notes: values.notes || null,
      });
      notify(`Calories for ${saved.entry_date} saved.`);
      onSaved?.(saved);
    } catch (error) {
      notify(applyApiError(error, setError), "error");
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
          label="Calories consumed"
          suffix="kcal"
          min={0}
          max={20000}
          step={1}
          placeholder="0"
          error={errors.calories_consumed?.message}
          {...register("calories_consumed")}
        />
        <NumberField
          label="Calories burned"
          suffix="kcal"
          min={0}
          max={10000}
          step={1}
          placeholder="0"
          hint="Exercise only; leave blank if none."
          error={errors.calories_burned?.message}
          {...register("calories_burned")}
        />
      </div>

      <TextAreaField
        label="Notes"
        placeholder="Optional"
        maxLength={1000}
        error={errors.notes?.message}
        {...register("notes")}
      />

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
