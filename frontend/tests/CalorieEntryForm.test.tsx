import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalorieEntryForm } from "@/components/forms/CalorieEntryForm";
import { ApiError } from "@/lib/api/client";
import { renderWithProviders, sampleCalorieEntry } from "./helpers";

const saveCalorieEntryByDate = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      saveCalorieEntryByDate: (...args: unknown[]) => saveCalorieEntryByDate(...args),
    },
  };
});

beforeEach(() => {
  saveCalorieEntryByDate.mockReset();
});

describe("calorie quick entry", () => {
  it("submits the local date and both calorie values", async () => {
    saveCalorieEntryByDate.mockResolvedValue(sampleCalorieEntry);
    const user = userEvent.setup();
    renderWithProviders(<CalorieEntryForm date="2026-07-15" />);

    await user.type(screen.getByLabelText(/calories consumed/i), "2200");
    await user.type(screen.getByLabelText(/calories burned/i), "500");
    await user.click(screen.getByRole("button", { name: /save calories/i }));

    await waitFor(() => expect(saveCalorieEntryByDate).toHaveBeenCalledTimes(1));
    expect(saveCalorieEntryByDate).toHaveBeenCalledWith("2026-07-15", {
      calories_consumed: 2200,
      calories_burned: 500,
      notes: null,
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/saved/i);
  });

  it("pre-fills today's existing entry so saving updates it", async () => {
    saveCalorieEntryByDate.mockResolvedValue(sampleCalorieEntry);
    const user = userEvent.setup();
    renderWithProviders(<CalorieEntryForm date="2026-07-15" entry={sampleCalorieEntry} />);

    const consumed = screen.getByLabelText(/calories consumed/i) as HTMLInputElement;
    expect(consumed.value).toBe("2200");
    expect((screen.getByLabelText(/notes/i) as HTMLTextAreaElement).value).toBe("long walk");

    await user.clear(consumed);
    await user.type(consumed, "1800");
    await user.click(screen.getByRole("button", { name: /save calories/i }));

    await waitFor(() =>
      expect(saveCalorieEntryByDate).toHaveBeenCalledWith(
        "2026-07-15",
        expect.objectContaining({ calories_consumed: 1800 }),
      ),
    );
  });

  it("blocks submission when calories consumed is missing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalorieEntryForm date="2026-07-15" />);

    await user.click(screen.getByRole("button", { name: /save calories/i }));

    expect(await screen.findByText(/enter the calories you consumed/i)).toBeInTheDocument();
    expect(saveCalorieEntryByDate).not.toHaveBeenCalled();
  });

  it("rejects negative calories before calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalorieEntryForm date="2026-07-15" />);

    await user.type(screen.getByLabelText(/calories consumed/i), "-50");
    await user.click(screen.getByRole("button", { name: /save calories/i }));

    expect(await screen.findByText(/cannot be negative/i)).toBeInTheDocument();
    expect(saveCalorieEntryByDate).not.toHaveBeenCalled();
  });

  it("shows backend field errors on the matching input", async () => {
    saveCalorieEntryByDate.mockRejectedValue(
      new ApiError(
        422,
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "The submitted data is invalid.",
            fields: { calories_consumed: "Value is too large." },
          },
        },
        "failed",
      ),
    );
    const user = userEvent.setup();
    renderWithProviders(<CalorieEntryForm date="2026-07-15" />);

    await user.type(screen.getByLabelText(/calories consumed/i), "2200");
    await user.click(screen.getByRole("button", { name: /save calories/i }));

    expect(await screen.findByText(/value is too large/i)).toBeInTheDocument();
  });
});
