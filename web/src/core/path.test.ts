import { describe, expect, it } from "vitest";
import type { KindData } from "../store/schemas";
import { DEFAULT_CANVAS } from "./canvas";
import { buildPath, conversationDate, discussesStep, isFeedbackConversation, talkedToInWeek, type PathConversation, type PathInput } from "./path";

const conv = (path: string, data: Partial<KindData<"conversation">>, notes = "They rebuild schedules every Sunday."): PathConversation => ({
  path,
  notes,
  data: { type: "customer", person: "Maya", quotes: [], numbers: [], followUps: [], relatedTests: [], areas: [], whatChangesConfirmed: false, ...data } as KindData<"conversation">,
});

const base = (over: Partial<PathInput> = {}): PathInput => ({
  defs: DEFAULT_CANVAS,
  blocks: new Map(),
  setupComplete: true,
  conversations: [],
  tests: [],
  openCommitments: [],
  focus: null,
  ...over,
});

describe("buildPath", () => {
  it("starts with You, then the canvas steps in order", () => {
    const p = buildPath(base());
    expect(p.steps.map((s) => s.id)).toEqual(["you", ...DEFAULT_CANVAS.map((d) => d.id)]);
    expect(p.total).toBe(DEFAULT_CANVAS.length + 1);
    expect(p.steps[1]).toMatchObject({ title: "Customer", href: "/path/customer" });
  });
  it("uses the founder's own blocks, with their prompt as the meaning", () => {
    const p = buildPath(base({ defs: [{ id: "benefit", title: "Benefit", prompt: "What do they gain?" }] }));
    expect(p.steps[1]).toMatchObject({ id: "benefit", meaning: "What do they gain?" });
    expect(p.steps[1].doneWhen).toMatch(/talked with people/);
  });
  it("counts You as done once setup is complete, and the current step is the first not done", () => {
    const p = buildPath(base({ blocks: new Map([["customer", { done: "2026-10-10" }]]) }));
    expect(p.steps[0].done).toBe(true);
    expect(p.steps[1]).toMatchObject({ done: true, doneOn: "2026-10-10" });
    expect(p.current?.id).toBe("problem");
    expect(p.doneCount).toBe(2);
  });
  it("marks imported step text as needing confirmation", () => {
    const p = buildPath(base({ blocks: new Map([["problem", { seeded: true }]]) }));
    expect(p.steps.find((s) => s.id === "problem")?.needsConfirmation).toBe(true);
    expect(p.steps.find((s) => s.id === "customer")?.needsConfirmation).toBe(false);
  });
  it("makes this week's focus the current step, even when it's done", () => {
    const blocks = new Map(DEFAULT_CANVAS.map((d) => [d.id, { done: "2026-10-01" }]));
    expect(buildPath(base({ blocks })).allDone).toBe(true);
    expect(buildPath(base({ blocks })).current).toBeNull();
    const p = buildPath(base({ blocks, focus: "revenue" }));
    expect(p.current?.id).toBe("revenue");
    expect(p.allDone).toBe(true);
  });
  it("ignores a focus while any step is still not done", () => {
    const blocks = new Map(DEFAULT_CANVAS.filter((d) => d.id !== "cost").map((d) => [d.id, { done: "2026-10-01" }]));
    expect(buildPath(base({ blocks, focus: "revenue" })).current?.id).toBe("cost");
  });
  it("ignores a focus that names no step", () => {
    expect(buildPath(base({ focus: "nope" })).current?.id).toBe("customer");
  });
  it("counts feedback conversations that discussed each step; customer also counts untagged ones", () => {
    const conversations = [
      conv("conversations/2026-10-12-a.md", { areas: ["problem"] }),
      conv("conversations/2026-10-12-b.md", { areas: [] }),
      conv("conversations/2026-10-12-c.md", { areas: ["problem"], type: "mentor" }),
      conv("conversations/2026-10-12-d.md", { areas: ["problem"], seeded: true }),
      conv("conversations/2026-10-12-e.md", { areas: ["problem"] }, ""),
    ];
    const p = buildPath(base({ conversations }));
    expect(p.steps.find((s) => s.id === "problem")?.discussed).toBe(1);
    expect(p.steps.find((s) => s.id === "customer")?.discussed).toBe(1);
  });
  it("marks a step tested only by a complete, supported, confirmed test", () => {
    const t = (data: Partial<KindData<"test">>) => ({ path: "tests/2026-10-01-x.md", data: { area: "revenue", status: "complete", result: "supported", ...data } as KindData<"test"> });
    expect(buildPath(base({ tests: [t({})] })).steps.find((s) => s.id === "revenue")?.tested).toBe(true);
    expect(buildPath(base({ tests: [t({ result: "contradicted" })] })).steps.find((s) => s.id === "revenue")?.tested).toBe(false);
    expect(buildPath(base({ tests: [t({ seeded: true })] })).steps.find((s) => s.id === "revenue")?.tested).toBe(false);
  });
  it("counts open planned conversations per step", () => {
    const p = buildPath(base({ openCommitments: [{ link: "step:problem" }, { link: "step:problem" }, { link: "guide:x" }] }));
    expect(p.steps.find((s) => s.id === "problem")?.planned).toBe(2);
  });
});

describe("discussesStep", () => {
  it("counts a tagged feedback conversation for its own area, not others", () => {
    const c = conv("conversations/2026-10-12-a.md", { areas: ["problem"] });
    expect(discussesStep(c, "problem")).toBe(true);
    expect(discussesStep(c, "customer")).toBe(false);
  });
  it("counts an untagged feedback conversation only for customer", () => {
    const c = conv("conversations/2026-10-12-a.md", { areas: [] });
    expect(discussesStep(c, "customer")).toBe(true);
    expect(discussesStep(c, "problem")).toBe(false);
  });
  it("excludes advice conversations and unconfirmed imports", () => {
    expect(discussesStep(conv("conversations/2026-10-12-a.md", { areas: ["problem"], type: "mentor" }), "problem")).toBe(false);
    expect(discussesStep(conv("conversations/2026-10-12-a.md", { areas: ["problem"], seeded: true }), "problem")).toBe(false);
  });
});

describe("talked to", () => {
  it("counts feedback conversations dated in the week, using the file name when the date is unknown", () => {
    const conversations = [
      conv("conversations/2026-10-12-a.md", { date: "2026-10-12" }),
      conv("conversations/2026-10-13-b.md", { date: null }),
      conv("conversations/2026-10-05-c.md", { date: "2026-10-05" }),
      conv("conversations/2026-10-13-d.md", { date: "2026-10-13", type: "investor" }),
    ];
    expect(talkedToInWeek(conversations, "2026-W42")).toBe(2);
    expect(talkedToInWeek(conversations, "2026-W41")).toBe(1);
  });
  it("reads the date from the file name", () => {
    expect(conversationDate({ path: "conversations/2026-10-13-b.md", data: {} })).toBe("2026-10-13");
  });
  it("needs a confirmed customer or prospect conversation that records something", () => {
    expect(isFeedbackConversation(conv("conversations/2026-10-12-a.md", { type: "prospect" }))).toBe(true);
    expect(isFeedbackConversation(conv("conversations/2026-10-12-a.md", { type: "partner" }))).toBe(false);
    expect(isFeedbackConversation(conv("conversations/2026-10-12-a.md", {}, "  "))).toBe(false);
  });
});
