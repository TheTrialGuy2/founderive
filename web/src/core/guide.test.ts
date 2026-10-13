import { describe, expect, it } from "vitest";
import { factsFromFounder, GUIDE_STEPS, guideStepFor, guideStepForWeek } from "./guide";

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

describe("guideStepForWeek", () => {
  const facts = { hasTargetCustomer: true };
  it("proposes no new step while a guide commitment is open this week", () =>
    expect(guideStepForWeek("idea", facts, [{ status: "open", link: "guide:problem-conversations" }])).toBeNull());
  it("a done guide commitment excludes its step for the week", () =>
    expect(guideStepForWeek("idea", facts, [{ status: "done", link: "guide:problem-conversations" }])?.id).toBe("riskiest-assumption"));
  it("a dropped guide commitment doesn't exclude its step", () =>
    expect(guideStepForWeek("idea", facts, [{ status: "dropped", link: "guide:problem-conversations" }])?.id).toBe("problem-conversations"));
  it("ignores commitments not linked to the guide", () =>
    expect(guideStepForWeek("idea", facts, [{ status: "open", link: null }, { status: "open", link: "notes/a.md" }])?.id).toBe("problem-conversations"));
});

describe("factsFromFounder", () => {
  it("seeds nothing from no evidence or conversations", () => {
    expect(factsFromFounder({ evidence: "none" })).toEqual({ hasTargetCustomer: false });
    expect(factsFromFounder({ evidence: "conversations", targetCustomer: "Agency owners" })).toEqual({ hasTargetCustomer: true });
    expect(factsFromFounder({})).toEqual({ hasTargetCustomer: false });
  });
  it("active users count as five customer conversations", () =>
    expect(factsFromFounder({ evidence: "active-users" })).toEqual({ hasTargetCustomer: false, customerConversations: 5 }));
  it("paying customers also mean an offer, made three times", () =>
    expect(factsFromFounder({ evidence: "paying-customers" })).toEqual({ hasTargetCustomer: false, customerConversations: 5, hasOffer: true, offersMade: 3 }));
  it("repeat customers add one repeat customer", () =>
    expect(factsFromFounder({ evidence: "repeat-customers" })).toEqual({ hasTargetCustomer: false, customerConversations: 5, hasOffer: true, offersMade: 3, repeatCustomers: 1 }));
  it("a validating founder with active users isn't asked for five problem conversations", () =>
    expect(guideStepFor("validating", factsFromFounder({ evidence: "active-users", targetCustomer: "Agency owners" }))?.id).toBe("riskiest-assumption"));
});
