import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeightEntryForm } from "@/components/forms/WeightEntryForm";
import { renderWithProviders, sampleWeightEntry } from "./helpers";

const saveWeightEntryByDate = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: { saveWeightEntryByDate: (...args: unknown[]) => saveWeightEntryByDate(...args) },
  };
});

beforeEach(() => {
  saveWeightEntryByDate.mockReset();
  saveWeightEntryByDate.mockResolvedValue(sampleWeightEntry);
});

describe("weight quick entry", () => {
  it("accepts a morning reading on its own", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeightEntryForm date="2026-07-15" unitSystem="metric" />);

    await user.type(screen.getByLabelText(/morning weight/i), "79");
    await user.click(screen.getByRole("button", { name: /save weight/i }));

    await waitFor(() =>
      expect(saveWeightEntryByDate).toHaveBeenCalledWith("2026-07-15", {
        morning_weight: 79,
        evening_weight: null,
        unit_system: "metric",
        notes: null,
      }),
    );
  });

  it("accepts an evening reading on its own", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeightEntryForm date="2026-07-15" unitSystem="metric" />);

    await user.type(screen.getByLabelText(/evening weight/i), "79.8");
    await user.click(screen.getByRole("button", { name: /save weight/i }));

    await waitFor(() =>
      expect(saveWeightEntryByDate).toHaveBeenCalledWith(
        "2026-07-15",
        expect.objectContaining({ morning_weight: null, evening_weight: 79.8 }),
      ),
    );
  });

  it("requires at least one reading", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeightEntryForm date="2026-07-15" unitSystem="metric" />);

    await user.click(screen.getByRole("button", { name: /save weight/i }));

    expect(
      await screen.findByText(/enter a morning weight, an evening weight, or both/i),
    ).toBeInTheDocument();
    expect(saveWeightEntryByDate).not.toHaveBeenCalled();
  });

  it("loads an existing entry and edits the two readings independently", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WeightEntryForm date="2026-07-15" entry={sampleWeightEntry} unitSystem="metric" />,
    );

    const evening = screen.getByLabelText(/evening weight/i) as HTMLInputElement;
    expect((screen.getByLabelText(/morning weight/i) as HTMLInputElement).value).toBe("79");
    expect(evening.value).toBe("79.8");

    await user.clear(evening);
    await user.type(evening, "80.2");
    await user.click(screen.getByRole("button", { name: /save weight/i }));

    await waitFor(() =>
      expect(saveWeightEntryByDate).toHaveBeenCalledWith(
        "2026-07-15",
        expect.objectContaining({ morning_weight: 79, evening_weight: 80.2 }),
      ),
    );
  });

  it("sends pounds when the profile uses imperial units", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WeightEntryForm date="2026-07-15" unitSystem="imperial" />);

    expect(screen.getByText(/\(lb\)/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/morning weight/i), "176.4");
    await user.click(screen.getByRole("button", { name: /save weight/i }));

    await waitFor(() =>
      expect(saveWeightEntryByDate).toHaveBeenCalledWith(
        "2026-07-15",
        expect.objectContaining({ morning_weight: 176.4, unit_system: "imperial" }),
      ),
    );
  });
});
