import { describe, expect, it } from "vitest";
import { GUIDE_STEPS, guideStepFor } from "./guide";

describe("Founder Guide", () => {
  it("every step declares outcome, why, area, evidence and stages", () => {
    for (const s of GUIDE_STEPS) {
      expect(s.title && s.why && s.area && s.evidence).toBeTruthy();
      expect(s.stages.length).toBeGreaterThan(0);
    }
  });
  it("an idea-stage founder with no customer starts by naming one", () => expect(guideStepFor("idea", {})?.id).toBe("customer"));
  it("treats a missing stage as idea", () => expect(guideStepFor(null, {})?.id).toBe("customer"));
  it("moves on once a step is done", () => expect(guideStepFor("idea", { hasTargetCustomer: true })?.id).toBe("problem-conversations"));
  it("skips steps already committed to this week", () =>
    expect(guideStepFor("idea", { hasTargetCustomer: true }, new Set(["problem-conversations"]))?.id).toBe("riskiest-assumption"));
  it("a revenue-stage founder starts with unit economics", () => expect(guideStepFor("revenue", {})?.id).toBe("unit-economics"));
  it("returns null when everything relevant is done", () =>
    expect(guideStepFor("revenue", { hasMoneyPulse: true, repeatCustomers: 1, offersMade: 3 })).toBeNull());
});
