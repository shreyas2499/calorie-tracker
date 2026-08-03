import { describe, expect, it } from "vitest";
import { addDays, isValidISODate, localToday, toISODate } from "@/lib/dates";

describe("local dates", () => {
  it("formats a Date as YYYY-MM-DD in local time", () => {
    // 1 Jan 2026, 23:30 local: must not roll into 2 Jan via UTC.
    expect(toISODate(new Date(2026, 0, 1, 23, 30))).toBe("2026-01-01");
  });

  it("returns today's local date", () => {
    expect(isValidISODate(localToday())).toBe(true);
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rejects malformed dates", () => {
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("01-01-2026")).toBe(false);
  });
});
