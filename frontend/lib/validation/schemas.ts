/**
 * Zod schemas mirroring the backend's validation rules.
 * The backend remains authoritative; these exist for instant feedback.
 */
import { z } from "zod";

export const LIMITS = {
  age: { min: 13, max: 120 },
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 25, max: 400 },
  caloriesConsumed: { min: 0, max: 20000 },
  caloriesBurned: { min: 0, max: 10000 },
  maintenance: { min: 800, max: 10000 },
  notes: 1000,
} as const;

const optionalNotes = z
  .string()
  .max(LIMITS.notes, `Notes must be ${LIMITS.notes} characters or fewer.`)
  .optional();

/** Empty string -> undefined, so optional number inputs behave. */
const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === "" || value === undefined || value === null) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  });

const requiredNumber = (message: string) =>
  z.union([z.string(), z.number()]).transform((value, ctx) => {
    if (value === "" || value === undefined || value === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      return z.NEVER;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      return z.NEVER;
    }
    return parsed;
  });

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(120),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]).optional(),
    age: requiredNumber("Enter your age."),
    sex: z.enum(["male", "female"]),
    preferred_unit_system: z.enum(["metric", "imperial"]),
    activity_level: z.enum([
      "sedentary",
      "lightly_active",
      "moderately_active",
      "very_active",
      "extra_active",
    ]),
    height_cm: optionalNumber,
    height_feet: optionalNumber,
    height_inches: optionalNumber,
    weight: requiredNumber("Enter your current weight."),
    manual_maintenance_calories: optionalNumber,
  })
  .superRefine((values, ctx) => {
    if (values.age < LIMITS.age.min || values.age > LIMITS.age.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["age"],
        message: `Age must be between ${LIMITS.age.min} and ${LIMITS.age.max}.`,
      });
    }

    if (values.preferred_unit_system === "metric") {
      const height = values.height_cm;
      if (height === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["height_cm"],
          message: "Enter your height in centimetres.",
        });
      } else if (height < LIMITS.heightCm.min || height > LIMITS.heightCm.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["height_cm"],
          message: `Height must be between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max} cm.`,
        });
      }
      if (values.weight < LIMITS.weightKg.min || values.weight > LIMITS.weightKg.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weight"],
          message: `Weight must be between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`,
        });
      }
    } else {
      if (values.height_feet === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["height_feet"],
          message: "Enter your height in feet.",
        });
      }
      if (
        values.height_inches !== undefined &&
        (values.height_inches < 0 || values.height_inches >= 12)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["height_inches"],
          message: "Inches must be between 0 and 11.",
        });
      }
      const weightKg = values.weight * 0.45359237;
      if (weightKg < LIMITS.weightKg.min || weightKg > LIMITS.weightKg.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["weight"],
          message: "Enter a realistic weight in pounds.",
        });
      }
    }

    const manual = values.manual_maintenance_calories;
    if (
      manual !== undefined &&
      (manual < LIMITS.maintenance.min || manual > LIMITS.maintenance.max)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manual_maintenance_calories"],
        message: `Enter a value between ${LIMITS.maintenance.min} and ${LIMITS.maintenance.max}, or leave it blank.`,
      });
    }
  });

export type ProfileFormValues = z.input<typeof profileSchema>;
export type ProfileFormOutput = z.output<typeof profileSchema>;

export const calorieEntrySchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  calories_consumed: requiredNumber("Enter the calories you consumed.").pipe(
    z
      .number()
      .min(LIMITS.caloriesConsumed.min, "Calories cannot be negative.")
      .max(LIMITS.caloriesConsumed.max, `Enter ${LIMITS.caloriesConsumed.max} or fewer calories.`),
  ),
  calories_burned: optionalNumber.pipe(
    z
      .number()
      .min(LIMITS.caloriesBurned.min, "Calories cannot be negative.")
      .max(LIMITS.caloriesBurned.max, `Enter ${LIMITS.caloriesBurned.max} or fewer calories.`)
      .optional(),
  ),
  notes: optionalNotes,
});

export type CalorieFormValues = z.input<typeof calorieEntrySchema>;
export type CalorieFormOutput = z.output<typeof calorieEntrySchema>;

export const weightEntrySchema = z
  .object({
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    morning_weight: optionalNumber,
    evening_weight: optionalNumber,
    notes: optionalNotes,
  })
  .superRefine((values, ctx) => {
    if (values.morning_weight === undefined && values.evening_weight === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["morning_weight"],
        message: "Enter a morning weight, an evening weight, or both.",
      });
    }
    (["morning_weight", "evening_weight"] as const).forEach((field) => {
      const value = values[field];
      if (value !== undefined && value <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Weight must be greater than zero.",
        });
      }
    });
  });

export type WeightFormValues = z.input<typeof weightEntrySchema>;
export type WeightFormOutput = z.output<typeof weightEntrySchema>;

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export const UNIT_OPTIONS = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lb, ft/in)" },
] as const;

export const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "lightly_active", label: "Lightly active (1-3 days/week)" },
  { value: "moderately_active", label: "Moderately active (3-5 days/week)" },
  { value: "very_active", label: "Very active (6-7 days/week)" },
  { value: "extra_active", label: "Extra active (physical job or twice daily)" },
] as const;
