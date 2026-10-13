import { describe, expect, it } from "vitest";
import { localISODate, resolveToday } from "./today";

describe("today", () => {
  it("formats a local date", () => expect(localISODate(new Date(2026, 9, 3, 23, 30))).toBe("2026-10-03"));
  it("prefers an override", () => expect(resolveToday("2026-09-15")).toBe("2026-09-15"));
  it("falls back to the real date", () => expect(resolveToday(null)).toBe(localISODate()));
});
