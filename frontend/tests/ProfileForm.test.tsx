import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { renderWithProviders, sampleProfile } from "./helpers";

const createProfile = vi.fn();
const updateProfile = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      createProfile: (...args: unknown[]) => createProfile(...args),
      updateProfile: (...args: unknown[]) => updateProfile(...args),
    },
  };
});

beforeEach(() => {
  createProfile.mockReset().mockResolvedValue(sampleProfile);
  updateProfile.mockReset().mockResolvedValue(sampleProfile);
});

describe("profile form validation", () => {
  it("requires a name, age, height and weight", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={null} onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /create profile/i }));

    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(await screen.findByText(/enter your age/i)).toBeInTheDocument();
    expect(await screen.findByText(/enter your current weight/i)).toBeInTheDocument();
    expect(createProfile).not.toHaveBeenCalled();
  });

  it("rejects an age outside 13-120", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={null} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText(/^name$/i), "Shreyas");
    await user.type(screen.getByLabelText(/^age$/i), "9");
    await user.type(screen.getByLabelText(/height/i), "180");
    await user.type(screen.getByLabelText(/current weight/i), "80");
    await user.click(screen.getByRole("button", { name: /create profile/i }));

    expect(await screen.findByText(/age must be between 13 and 120/i)).toBeInTheDocument();
  });

  it("rejects a height outside 100-250 cm", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={null} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText(/^name$/i), "Shreyas");
    await user.type(screen.getByLabelText(/^age$/i), "30");
    await user.type(screen.getByLabelText(/height/i), "300");
    await user.type(screen.getByLabelText(/current weight/i), "80");
    await user.click(screen.getByRole("button", { name: /create profile/i }));

    expect(await screen.findByText(/height must be between 100 and 250 cm/i)).toBeInTheDocument();
  });

  it("submits a valid metric profile", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={null} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText(/^name$/i), "Shreyas");
    await user.type(screen.getByLabelText(/^age$/i), "30");
    await user.type(screen.getByLabelText(/height/i), "180");
    await user.type(screen.getByLabelText(/current weight/i), "80");
    await user.click(screen.getByRole("button", { name: /create profile/i }));

    await waitFor(() =>
      expect(createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Shreyas",
          age: 30,
          height: 180,
          weight: 80,
          preferred_unit_system: "metric",
        }),
      ),
    );
  });

  it("switches to feet, inches and pounds for imperial users", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={null} onSaved={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText(/unit system/i), "imperial");

    expect(screen.getByText(/\(ft\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\(in\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\(lb\)/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^name$/i), "Shreyas");
    await user.type(screen.getByLabelText(/^age$/i), "30");
    const [feet, inches] = screen.getAllByLabelText(/height/i);
    await user.type(feet, "5");
    await user.type(inches, "11");
    await user.type(screen.getByLabelText(/current weight/i), "176.4");
    await user.click(screen.getByRole("button", { name: /create profile/i }));

    // The backend converts to cm/kg; the form sends feet, inches and pounds.
    await waitFor(() =>
      expect(createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          preferred_unit_system: "imperial",
          height_feet: 5,
          height_inches: 11,
          weight: 176.4,
        }),
      ),
    );
  });

  it("updates instead of creating when a profile already exists", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={sampleProfile} onSaved={vi.fn()} />);

    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe("Shreyas");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(createProfile).not.toHaveBeenCalled();
  });

  it("validates the optional manual maintenance target", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm profile={sampleProfile} onSaved={vi.fn()} />);

    await user.type(screen.getByLabelText(/manual maintenance target/i), "100");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByText(/between 800 and 10000/i)).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
