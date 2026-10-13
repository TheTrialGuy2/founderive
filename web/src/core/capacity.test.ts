import { describe, expect, it } from "vitest";
import { capacityWarning } from "./capacity";

describe("capacityWarning", () => {
  it("is quiet when commitments fit the week", () => expect(capacityWarning(15, null, 5)).toBeNull());
  it("warns in one plain line when they plainly exceed it", () =>
    expect(capacityWarning(15, null, 6)).toBe("Your 6 open commitments need about 18 hours, and you have about 15 this week. Finish or drop one before adding more."));
  it("uses the commitment level when hours aren't set", () => {
    expect(capacityWarning(null, "nights-weekends", 3)).toBeNull();
    expect(capacityWarning(null, "nights-weekends", 4)).toMatch(/about 12 hours, and you have about 10 /);
  });
  it("says nothing without any sense of the founder's time", () => expect(capacityWarning(null, null, 20)).toBeNull());
  it("reads naturally for one commitment", () =>
    expect(capacityWarning(2, null, 1)).toBe("Your 1 open commitment needs about 3 hours, and you have about 2 this week. Finish or drop one before adding more."));
});
