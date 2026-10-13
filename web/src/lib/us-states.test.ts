import { describe, expect, it } from "vitest";
import { US_STATES } from "./us-states";

describe("US_STATES", () => {
  it("has 50 states plus DC and Puerto Rico, each with a two-letter code", () => {
    expect(US_STATES).toHaveLength(52);
    for (const s of US_STATES) expect(s.code).toMatch(/^[A-Z]{2}$/);
  });
  it("is sorted by full name", () => {
    const names = US_STATES.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
  it("includes North Carolina, DC and Puerto Rico", () => {
    expect(US_STATES).toContainEqual({ code: "NC", name: "North Carolina" });
    expect(US_STATES).toContainEqual({ code: "DC", name: "District of Columbia" });
    expect(US_STATES).toContainEqual({ code: "PR", name: "Puerto Rico" });
  });
  it("has no duplicate codes", () => {
    const codes = US_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
