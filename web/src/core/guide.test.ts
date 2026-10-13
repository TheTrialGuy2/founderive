import { describe, expect, it } from "vitest";
import { factsFromFounder, factsFromRecords, GUIDE_STEPS, guideProgress, guideStepFor, guideStepForWeek, mergeFacts } from "./guide";

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
  it("seeds nothing from no evidence, conversations, or active users", () => {
    expect(factsFromFounder({ evidence: "none" })).toEqual({ hasTargetCustomer: false });
    expect(factsFromFounder({ evidence: "conversations", targetCustomer: "Agency owners" })).toEqual({ hasTargetCustomer: true });
    expect(factsFromFounder({ evidence: "active-users" })).toEqual({ hasTargetCustomer: false });
    expect(factsFromFounder({})).toEqual({ hasTargetCustomer: false });
  });
  it("doesn't fabricate a conversation count for any evidence level", () => {
    for (const evidence of ["none", "conversations", "active-users", "paying-customers", "repeat-customers"] as const) {
      expect(factsFromFounder({ evidence }).customerConversations).toBeUndefined();
    }
  });
  it("a paying customer means an offer was made, at least once", () =>
    expect(factsFromFounder({ evidence: "paying-customers" })).toEqual({ hasTargetCustomer: false, hasOffer: true, offersMade: 1 }));
  it("a single paying customer, not three, is all that's guaranteed", () =>
    expect(factsFromFounder({ evidence: "paying-customers" }).offersMade).toBe(1));
  it("a repeat customer also means someone came back", () =>
    expect(factsFromFounder({ evidence: "repeat-customers" })).toEqual({ hasTargetCustomer: false, hasOffer: true, offersMade: 1, repeatCustomers: 1 }));
  it("a validating founder with paying customers still needs to talk to five people (no conversations proven)", () =>
    expect(guideStepFor("validating", factsFromFounder({ evidence: "paying-customers", targetCustomer: "Agency owners" }))?.id).toBe("problem-conversations"));
  it("a validating founder with active users still needs to talk to five people (no conversations proven)", () =>
    expect(guideStepFor("validating", factsFromFounder({ evidence: "active-users", targetCustomer: "Agency owners" }))?.id).toBe("problem-conversations"));
});

describe("evidence on guide steps", () => {
  it("counts customer and prospect conversations only, and tests not stopped early", () => {
    expect(
      factsFromRecords({
        conversations: [{ type: "customer" }, { type: "prospect" }, { type: "mentor" }, { type: "investor" }],
        tests: [{ status: "running" }, { status: "complete" }, { status: "abandoned" }],
      }),
    ).toEqual({ customerConversations: 2, tests: 2, completedTests: 1 });
  });
  it("doesn't count an imported conversation until the founder confirms it", () =>
    expect(factsFromRecords({ conversations: [{ type: "customer", seeded: true }, { type: "prospect", seeded: false }, { type: "customer" }], tests: [] }).customerConversations).toBe(2));
  it("merges setup facts with record facts, keeping the stronger", () => {
    expect(mergeFacts({ hasTargetCustomer: true, offersMade: 1 }, { customerConversations: 3, offersMade: 0 })).toEqual({ hasTargetCustomer: true, offersMade: 1, customerConversations: 3 });
  });
  it("a step completes from logged evidence, not a checkbox", () => {
    expect(guideStepFor("validating", { hasTargetCustomer: true, customerConversations: 4 })?.id).toBe("problem-conversations");
    expect(guideStepFor("validating", { hasTargetCustomer: true, customerConversations: 5 })?.id).toBe("riskiest-assumption");
    expect(guideStepFor("validating", { hasTargetCustomer: true, customerConversations: 5, tests: 1 })?.id).toBe("finish-test");
  });
  it("says how much evidence a step has so far", () => {
    const step = (id: string) => GUIDE_STEPS.find((s) => s.id === id)!;
    expect(guideProgress(step("problem-conversations"), { customerConversations: 2 })).toBe("2 of 5 customer conversations logged");
    expect(guideProgress(step("finish-test"), { tests: 1 })).toBe("1 test designed, none completed yet");
    expect(guideProgress(step("customer"), {})).toBeNull();
  });
});
