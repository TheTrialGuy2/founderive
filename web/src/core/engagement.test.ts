import { describe, expect, it } from "vitest";
import { daysBetween, engagementStatus } from "./engagement";

describe("daysBetween", () => {
  it("counts whole days between ISO dates", () => {
    expect(daysBetween("2026-10-01", "2026-10-12")).toBe(11);
  });
});

describe("engagementStatus", () => {
  const today = "2026-10-12";
  it.each([
    ["2026-10-12", "active"],
    ["2026-10-05", "active"],
    ["2026-10-04", "stalled"],
    ["2026-09-29", "stalled"],
    ["2026-09-28", "quiet"],
  ] as const)("last activity %s is %s", (last, expected) => {
    expect(engagementStatus(last, today)).toBe(expected);
  });
});
