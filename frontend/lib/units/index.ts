/**
 * Display-side unit helpers.
 *
 * The backend is authoritative: it stores kilograms/centimetres and returns
 * values already converted to the user's preferred system. These helpers only
 * format, and convert for the profile form's height inputs.
 */
import type { UnitSystem } from "@/types";

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export function weightUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === "imperial" ? "lb" : "kg";
}

export function lbToKg(pounds: number): number {
  return pounds * KG_PER_LB;
}

export function kgToLb(kilograms: number): number {
  return kilograms / KG_PER_LB;
}

export function feetInchesToCm(feet: number, inches = 0): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function cmToFeetInches(centimetres: number): { feet: number; inches: number } {
  const totalInches = centimetres / CM_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches - feet * 12) * 10) / 10;
  if (inches >= 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

/** Formats a weight with its unit, or an em dash when there is no value. */
export function formatWeight(
  value: number | null | undefined,
  unitSystem: UnitSystem,
  digits = 1,
): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)} ${weightUnitLabel(unitSystem)}`;
}

export function formatCalories(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value).toLocaleString()} kcal`;
}

/** Signed calorie balance, e.g. "−420 kcal". Sign is explicit, never colour-only. */
export function formatBalance(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "−" : rounded > 0 ? "+" : "";
  return `${sign}${Math.abs(rounded).toLocaleString()} kcal`;
}

export function formatSignedWeight(
  value: number | null | undefined,
  unitSystem: UnitSystem,
  digits = 1,
): string {
  if (value === null || value === undefined) return "—";
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(digits)} ${weightUnitLabel(unitSystem)}`;
}
