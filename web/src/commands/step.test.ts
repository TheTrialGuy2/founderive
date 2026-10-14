import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { createConversation } from "./conversations";
import { planConversation } from "./path";
import { loadStep } from "./step";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir); // counts below depend only on what each test logs, as in today-path.test.ts
});
afterEach(() => env.cleanup());

describe("loadStep", () => {
  it("returns the step, its place, the people who discussed it and what's planned", async () => {
    await createConversation({ type: "customer", person: "Maya", org: null, date: "2026-10-12", segment: "Agency owner", context: null, questionsAsked: null, observedBehavior: null, quotes: ["I rebuild it every Sunday"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["problem"], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" });
    await planConversation("2026-W42", "problem", { who: "Dana", due: "2026-10-16" });
    const v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.step).toMatchObject({ id: "problem", discussed: 1, planned: 1 });
    expect(v.index).toBe(3);
    expect(v.nextStep?.id).toBe("solution");
    expect(v.people[0]).toMatchObject({ person: "Maya", role: "Agency owner", line: "I rebuild it every Sunday" });
  });
  it("reports a step that isn't on the path", async () => {
    expect((await loadStep("nope")).status).toBe("missing");
  });
  it("orders people newest first, with an undated conversation last", async () => {
    const base = { type: "customer" as const, org: null, segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["noted"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["problem"], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" };
    await createConversation({ ...base, person: "Ann", date: "2026-10-01" });
    await createConversation({ ...base, person: "Bea", date: "2026-10-10" });
    await createConversation({ ...base, person: "Cass", date: null }, {}, "2026-10-13");
    const v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.people.map((p) => p.person)).toEqual(["Bea", "Ann", "Cass"]);
  });
  it("sets `changed` only when what this conversation changes is confirmed", async () => {
    const base = { type: "customer" as const, org: null, date: "2026-10-12", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["noted"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["problem"], followUps: [] };
    await createConversation({ ...base, person: "Dee", whatChanges: "Focus on scheduling", whatChangesConfirmed: false, notes: "" });
    await createConversation({ ...base, person: "Eli", whatChanges: "Simplify onboarding", whatChangesConfirmed: true, notes: "" });
    const v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.people.find((p) => p.person === "Dee")?.changed).toBeNull();
    expect(v.people.find((p) => p.person === "Eli")?.changed).toBe("Simplify onboarding");
  });
});
