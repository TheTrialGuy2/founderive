import { describe, expect, it } from "vitest";
import { addDays, isoWeekId, weekStart } from "./week";

describe("ISO weeks (Monday start)", () => {
  it("names the week", () => expect(isoWeekId("2026-10-13")).toBe("2026-W42"));
  it("Monday starts the week", () => expect(isoWeekId("2026-10-12")).toBe("2026-W42"));
  it("Sunday ends it", () => expect(isoWeekId("2026-10-18")).toBe("2026-W42"));
  it("late December can belong to next year", () => expect(isoWeekId("2025-12-29")).toBe("2026-W01"));
  it("early January can belong to last year (53-week year)", () => expect(isoWeekId("2027-01-01")).toBe("2026-W53"));
  it("finds the Monday", () => expect(weekStart("2026-10-15")).toBe("2026-10-12"));
});

describe("addDays", () => {
  it("adds across a month end", () => expect(addDays("2026-10-31", 1)).toBe("2026-11-01"));
  it("handles a leap day", () => expect(addDays("2028-02-28", 1)).toBe("2028-02-29"));
});
