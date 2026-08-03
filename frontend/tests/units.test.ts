import { describe, expect, it } from "vitest";
import {
  cmToFeetInches,
  feetInchesToCm,
  formatBalance,
  formatSignedWeight,
  formatWeight,
  kgToLb,
  lbToKg,
  weightUnitLabel,
} from "@/lib/units";

describe("unit conversion", () => {
  it("converts pounds to kilograms", () => {
    expect(lbToKg(220.462)).toBeCloseTo(100, 3);
  });

  it("converts kilograms to pounds", () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3);
  });

  it("round-trips without loss", () => {
    expect(lbToKg(kgToLb(82.35))).toBeCloseTo(82.35, 6);
  });

  it("converts feet and inches to centimetres", () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8, 4);
  });

  it("converts centimetres back to feet and inches", () => {
    expect(cmToFeetInches(177.8)).toEqual({ feet: 5, inches: 10 });
  });

  it("labels units correctly", () => {
    expect(weightUnitLabel("metric")).toBe("kg");
    expect(weightUnitLabel("imperial")).toBe("lb");
  });
});

describe("formatting", () => {
  it("shows an em dash when there is no value", () => {
    expect(formatWeight(null, "metric")).toBe("—");
    expect(formatBalance(undefined)).toBe("—");
  });

  it("signs calorie balances explicitly", () => {
    expect(formatBalance(-420)).toBe("−420 kcal");
    expect(formatBalance(310)).toBe("+310 kcal");
    expect(formatBalance(0)).toBe("0 kcal");
  });

  it("signs weight changes explicitly", () => {
    expect(formatSignedWeight(-1.8, "metric")).toBe("−1.8 kg");
    expect(formatSignedWeight(0.4, "imperial")).toBe("+0.4 lb");
  });
});
