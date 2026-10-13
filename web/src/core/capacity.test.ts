import { describe, expect, it } from "vitest";
import { capacityWarning } from "./capacity";

describe("capacityWarning", () => {
  it("is quiet when commitments fit the week", () => expect(capacityWarning(15, null, 5)).toBeNull());
  it("warns in one plain line when they plainly exceed it, stating only known facts and asking", () =>
    expect(capacityWarning(15, null, 6)).toBe("6 open items this week against the 15 hours you said you have. Does that fit?"));
  it("uses the commitment level's schedule name when hours aren't set, not a number", () => {
    expect(capacityWarning(null, "nights-weekends", 3)).toBeNull();
    expect(capacityWarning(null, "nights-weekends", 4)).toBe("4 open items this week against your nights-and-weekends schedule. Does that fit?");
  });
  it("says nothing without any sense of the founder's time", () => expect(capacityWarning(null, null, 20)).toBeNull());
  it("reads naturally for one open item", () =>
    expect(capacityWarning(2, null, 1)).toBe("1 open item this week against the 2 hours you said you have. Does that fit?"));
  it("never names the internal hour estimate or tells the founder what to do", () => {
    const line = capacityWarning(15, null, 6);
    expect(line).not.toMatch(/\b18\b/);
    expect(line).not.toMatch(/finish|drop/i);
  });
});
