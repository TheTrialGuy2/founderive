import { describe, expect, it } from "vitest";
import { weekActivity, weekStreak } from "./streak";

// 2026-10-12 is a Monday.
const TODAY = "2026-10-12";

describe("weekActivity", () => {
  it("marks which of the last N weeks had activity, current week first", () => {
    expect(weekActivity(["2026-10-12", "2026-10-07", "2026-09-22"], TODAY, 4)).toEqual([true, true, false, true]);
  });

  it("puts Sunday in the same week as the Monday before it", () => {
    expect(weekActivity(["2026-10-11"], TODAY, 2)).toEqual([false, true]);
  });
});

describe("weekStreak", () => {
  it("counts consecutive active weeks including this one", () => {
    expect(weekStreak([true, true, true, false, true])).toBe(3);
  });

  it("doesn't break just because this week isn't done yet", () => {
    expect(weekStreak([false, true, true, false])).toBe(2);
  });

  it("is zero when last week was missed too", () => {
    expect(weekStreak([false, false, true])).toBe(0);
  });
});
