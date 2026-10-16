import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { conversationSchema, decisionSchema, kindOf, testSchema } from "./schemas";

const paths = (schema: z.ZodType, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};
const conversation = (extra: Record<string, unknown> = {}) => ({ type: "customer", person: "Dana", date: "2026-10-08", ...extra });
const ventureTest = (extra: Record<string, unknown> = {}) => ({
  title: "Paid pilot",
  area: "revenue",
  belief: "Owners will pay",
  test: "Offer a pilot to five owners",
  successCriteria: "Two sign",
  failureCriteria: "None sign",
  ...extra,
});
const decision = (extra: Record<string, unknown> = {}) => ({
  title: "Focus on small agencies",
  date: "2026-10-09",
  decision: "Only agencies with 10-50 caregivers",
  why: "The owner feels the pain",
  reversible: true,
  ...extra,
});

describe("conversation", () => {
  it("applies defaults", () => {
    expect(conversationSchema.parse(conversation())).toMatchObject({ quotes: [], numbers: [], followUps: [], relatedTests: [], areas: [], whatChangesConfirmed: false });
  });
  it("catches a type typo, a misspelled key and an unknown area", () => {
    expect(paths(conversationSchema, conversation({ type: "customr" }))).toEqual(["type"]);
    expect(paths(conversationSchema, conversation({ quote: ["x"] }))).not.toEqual([]);
    expect(paths(conversationSchema, conversation({ areas: ["Not An Id"] }))).toEqual(["areas.0"]);
  });
  it("can't be confirmed without saying what changes", () => {
    expect(paths(conversationSchema, conversation({ whatChangesConfirmed: true }))).toEqual(["whatChangesConfirmed"]);
    expect(paths(conversationSchema, conversation({ whatChanges: "Price ceiling near $300", whatChangesConfirmed: true }))).toEqual([]);
  });
  it("takes a stance of supports, challenges or neither, and nothing else", () => {
    for (const stance of ["supports", "challenges", "neither"]) expect(paths(conversationSchema, conversation({ stance }))).toEqual([]);
    expect(paths(conversationSchema, conversation({ stance: "against" }))).toEqual(["stance"]);
  });
  it("an older confirmed record without a stance stays valid and reads as not said yet", () => {
    expect(conversationSchema.parse(conversation({ whatChanges: "Price ceiling near $300", whatChangesConfirmed: true })).stance).toBeUndefined();
  });
  it("follow-ups are open or done", () => {
    expect(paths(conversationSchema, conversation({ followUps: [{ id: "f-1", text: "Send one-pager", due: "2026-10-12" }] }))).toEqual([]);
    expect(paths(conversationSchema, conversation({ followUps: [{ id: "f-1", text: "Send", status: "dropped" }] }))).toEqual(["followUps.0.status"]);
  });
  it("allows an unknown date, but not an impossible one", () => {
    expect(paths(conversationSchema, { type: "customer", person: "Dana" })).toEqual([]);
    expect(paths(conversationSchema, conversation({ date: "2026-02-30" }))).toEqual(["date"]);
  });
  it("keeps a malformed link (it's a warning, not an error)", () => {
    expect(paths(conversationSchema, conversation({ relatedTests: ["tests/pilot.md"] }))).toEqual([]);
  });
});

describe("venture test", () => {
  it("defaults to planned with no evidence, result or decision", () => {
    expect(testSchema.parse(ventureTest())).toMatchObject({ status: "planned", evidenceStrength: "none", relatedConversations: [], relatedFiles: [] });
  });
  it("needs success and failure criteria", () => {
    expect(paths(testSchema, ventureTest({ successCriteria: "" }))).toEqual(["successCriteria"]);
    expect(paths(testSchema, ventureTest({ failureCriteria: undefined }))).toEqual(["failureCriteria"]);
  });
  it("a complete test has both a result and a decision", () => {
    expect(paths(testSchema, ventureTest({ status: "complete", result: "supported" }))).toEqual(["decision"]);
    expect(paths(testSchema, ventureTest({ status: "complete", result: "inconclusive", decision: "revise" }))).toEqual([]);
  });
  it("keeps result and decision apart: inconclusive is a result, not a decision", () => {
    expect(paths(testSchema, ventureTest({ status: "complete", result: "supported", decision: "inconclusive" }))).toEqual(["decision"]);
  });
  it("only a complete test has a result", () => expect(paths(testSchema, ventureTest({ status: "running", result: "supported" }))).toEqual(["result"]));
  it("a test stopped early needs a reason", () => {
    expect(paths(testSchema, ventureTest({ status: "abandoned" }))).toEqual(["abandonReason"]);
    expect(paths(testSchema, ventureTest({ status: "abandoned", abandonReason: "The assumption no longer matters" }))).toEqual([]);
  });
});

describe("decision", () => {
  it("applies defaults and needs a why and whether it's reversible", () => {
    expect(decisionSchema.parse(decision())).toMatchObject({ status: "decided", evidence: [], alternatives: [] });
    expect(paths(decisionSchema, decision({ why: "" }))).toEqual(["why"]);
    expect(paths(decisionSchema, decision({ reversible: undefined }))).toEqual(["reversible"]);
  });
  it("allows an open question without a decision, then enforces decided fields", () => {
    const open = { title: "Who pays?", date: "2026-10-15", status: "open", decideBy: "2026-10-29", alternatives: ["Founder", "Agency"] };
    const parsed = decisionSchema.parse(open);
    expect(parsed.status).toBe("open");
    expect(parsed.decision).toBeUndefined();
    expect(parsed.why).toBeUndefined();
    expect(parsed.reversible).toBeUndefined();
    expect(paths(decisionSchema, { ...open, decision: "Agency pays", why: "They benefit", reversible: true }).sort()).toEqual(["decision", "reversible", "why"]);
    expect(paths(decisionSchema, { ...open, status: "decided" }).sort()).toEqual(["decision", "reversible", "why"]);
  });
});

describe("dated file kinds", () => {
  it("maps dated paths to kinds and rejects undated or badly named files", () => {
    expect(kindOf("conversations/2026-10-08-dana-ortiz.md")).toBe("conversation");
    expect(kindOf("tests/2026-10-06-paid-pilot.md")).toBe("test");
    expect(kindOf("decisions/2026-10-09-focus.md")).toBe("decision");
    expect(kindOf("tests/paid-pilot.md")).toBeNull();
    expect(kindOf("tests/2026-10-06-Paid-Pilot.md")).toBeNull();
    expect(kindOf("tests/2026-10-06-paid--pilot.md")).toBeNull();
    expect(kindOf("tests/2026-99-99-paid-pilot.md")).toBeNull();
    expect(kindOf("conversations/2026-02-30-dana.md")).toBeNull();
  });
});
