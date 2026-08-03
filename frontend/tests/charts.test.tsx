import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalorieChart } from "@/components/charts/CalorieChart";
import { WeightChart } from "@/components/charts/WeightChart";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorNotice } from "@/components/ui/ErrorNotice";

describe("chart empty states", () => {
  it("tells the user when there are no calorie entries", () => {
    render(
      <CalorieChart
        series={{
          start_date: "2026-07-01",
          end_date: "2026-07-07",
          points: [],
          tracked_days: 0,
          total_days: 7,
        }}
      />,
    );
    expect(screen.getByText(/no calorie entries in this range/i)).toBeInTheDocument();
  });

  it("tells the user when there are no weight entries", () => {
    render(
      <WeightChart
        series={{
          start_date: "2026-07-01",
          end_date: "2026-07-07",
          unit_system: "metric",
          unit_label: "kg",
          points: [],
          tracked_days: 0,
          total_days: 7,
        }}
      />,
    );
    expect(screen.getByText(/no weight entries in this range/i)).toBeInTheDocument();
  });
});

describe("loading and error states", () => {
  it("exposes skeletons to assistive tech as loading", () => {
    render(<ChartSkeleton />);
    expect(screen.getByRole("status", { name: /loading chart/i })).toBeInTheDocument();
  });

  it("renders a card skeleton while data loads", () => {
    render(<CardSkeleton />);
    expect(screen.getByRole("status", { name: /loading/i })).toBeInTheDocument();
  });

  it("announces API errors", () => {
    render(<ErrorNotice message="Could not reach the API." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the API.");
  });
});

describe("status labelling", () => {
  it("uses text, not colour alone", () => {
    render(<StatusBadge status="deficit" label="Deficit" />);
    expect(screen.getByText("Deficit")).toBeInTheDocument();
  });

  it("labels missing data", () => {
    render(<StatusBadge status="no_data" label="No data recorded" />);
    expect(screen.getByText("No data recorded")).toBeInTheDocument();
  });
});
