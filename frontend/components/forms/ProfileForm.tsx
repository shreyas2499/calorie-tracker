"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { applyApiError } from "@/components/forms/formError";
import { Button } from "@/components/ui/Button";
import { NumberField, SelectField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import {
  ACTIVITY_OPTIONS,
  SEX_OPTIONS,
  UNIT_OPTIONS,
  profileSchema,
  type ProfileFormValues,
} from "@/lib/validation/schemas";
import type { Profile } from "@/types";

interface ProfileFormProps {
  profile: Profile | null;
  onSaved: (profile: Profile) => void;
}

function toDefaults(profile: Profile | null): ProfileFormValues {
  if (!profile) {
    return {
      name: "",
      email: "",
      age: "",
      sex: "male",
      preferred_unit_system: "metric",
      activity_level: "moderately_active",
      height_cm: "",
      height_feet: "",
      height_inches: "",
      weight: "",
      manual_maintenance_calories: "",
    };
  }
  return {
    name: profile.name,
    email: profile.email ?? "",
    age: profile.age,
    sex: profile.sex,
    preferred_unit_system: profile.preferred_unit_system,
    activity_level: profile.activity_level,
    height_cm: profile.height_cm,
    height_feet: profile.height_feet,
    height_inches: profile.height_inches,
    weight: profile.current_weight,
    manual_maintenance_calories: profile.manual_maintenance_calories ?? "",
  };
}

export function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const { notify } = useToast();

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toDefaults(profile),
  });

  const unitSystem = useWatch({ control, name: "preferred_unit_system" });
  const isImperial = unitSystem === "imperial";

  const onSubmit = handleSubmit(async (raw) => {
    const values = profileSchema.parse(raw);
    try {
      const payload = {
        name: values.name,
        email: values.email ? values.email : null,
        age: values.age,
        sex: values.sex,
        preferred_unit_system: values.preferred_unit_system,
        activity_level: values.activity_level,
        // The backend converts to centimetres/kilograms before saving.
        height: values.preferred_unit_system === "metric" ? values.height_cm : values.height_feet,
        height_feet: values.height_feet,
        height_inches: values.height_inches ?? 0,
        weight: values.weight,
        manual_maintenance_calories: values.manual_maintenance_calories ?? null,
      };
      const saved = profile ? await api.updateProfile(payload) : await api.createProfile(payload);
      reset(toDefaults(saved));
      notify("Profile saved. Maintenance calories recalculated.");
      onSaved(saved);
    } catch (error) {
      notify(applyApiError(error, setError, { height_cm: "height_cm", weight_kg: "weight" }), "error");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          hint="Optional. Reserved for future sign-in."
          error={errors.email?.message}
          {...register("email")}
        />
        <NumberField label="Age" min={13} max={120} error={errors.age?.message} {...register("age")} />
        <SelectField label="Sex" options={SEX_OPTIONS as never} error={errors.sex?.message} {...register("sex")} />
        <SelectField
          label="Unit system"
          options={UNIT_OPTIONS as never}
          hint="Values are always stored in kg and cm."
          error={errors.preferred_unit_system?.message}
          {...register("preferred_unit_system")}
        />
        <SelectField
          label="Activity level"
          options={ACTIVITY_OPTIONS as never}
          error={errors.activity_level?.message}
          {...register("activity_level")}
        />
      </div>

      {isImperial ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            label="Height"
            suffix="ft"
            min={3}
            max={8}
            error={errors.height_feet?.message}
            {...register("height_feet")}
          />
          <NumberField
            label="Height"
            suffix="in"
            min={0}
            max={11}
            step={0.5}
            error={errors.height_inches?.message}
            {...register("height_inches")}
          />
          <NumberField
            label="Current weight"
            suffix="lb"
            step={0.1}
            error={errors.weight?.message}
            {...register("weight")}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Height"
            suffix="cm"
            min={100}
            max={250}
            step={0.5}
            error={errors.height_cm?.message}
            {...register("height_cm")}
          />
          <NumberField
            label="Current weight"
            suffix="kg"
            step={0.1}
            error={errors.weight?.message}
            {...register("weight")}
          />
        </div>
      )}

      <NumberField
        label="Manual maintenance target"
        suffix="kcal"
        min={800}
        max={10000}
        hint="Optional. When set, this overrides the calculated value."
        error={errors.manual_maintenance_calories?.message}
        {...register("manual_maintenance_calories")}
      />

      <Button type="submit" loading={isSubmitting}>
        {profile ? "Save profile" : "Create profile"}
      </Button>
    </form>
  );
}
