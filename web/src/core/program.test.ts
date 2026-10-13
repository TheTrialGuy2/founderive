import { describe, expect, it } from "vitest";
import { currentWeek, daysBetween, weekDate, weekFile } from "./program";

const base = { programStart: "2026-09-15", totalWeeks: 10 };

describe("program week math", () => {
  it("counts days across DST", () => expect(daysBetween("2026-10-30", "2026-11-03")).toBe(4));
  it("start day is week 1", () => expect(currentWeek({ ...base, today: "2026-09-15" })).toBe(1));
  it("day 6 is still week 1", () => expect(currentWeek({ ...base, today: "2026-09-21" })).toBe(1));
  it("day 7 is week 2", () => expect(currentWeek({ ...base, today: "2026-09-22" })).toBe(2));
  it("halfway session", () => expect(currentWeek({ ...base, today: "2026-10-13" })).toBe(5));
  it("clamps after the end", () => expect(currentWeek({ ...base, today: "2027-01-01" })).toBe(10));
  it("is null before the start", () => expect(currentWeek({ ...base, today: "2026-09-01" })).toBeNull());
  it("is null with no start date", () => expect(currentWeek({ programStart: null, today: "2026-10-13", totalWeeks: 10 })).toBeNull());
  it("uses an override, clamped", () => {
    expect(currentWeek({ ...base, today: "2026-10-13", override: 3 })).toBe(3);
    expect(currentWeek({ ...base, today: "2026-10-13", override: 40 })).toBe(10);
  });
  it("dates each week", () => expect(weekDate("2026-09-15", 5)).toBe("2026-10-13"));
  it("names week files", () => expect(weekFile(3)).toBe("program/week-03.md"));
});
