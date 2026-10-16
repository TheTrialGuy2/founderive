import { writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { confirmWhatChanges, createConversation } from "./conversations";
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
    expect(v.steps.map((step) => step.id)).toEqual(["you", "customer", "problem", "solution", "alternatives", "advantage", "channel", "revenue", "cost", "feasibility"]);
    expect(v.index).toBe(3);
    expect(v.nextStep?.id).toBe("solution");
    expect(v.people[0]).toMatchObject({ person: "Maya", role: "Agency owner", line: "I rebuild it every Sunday" });
  });
  it("counts imported conversations waiting, which nobody has discussed until they're confirmed", async () => {
    await createConversation({ type: "customer", person: "Maya", org: null, date: "2026-10-12", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["I rebuild it every Sunday"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: [], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" }, { seeded: true, source: "chat import" });
    const v = await loadStep("customer");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.people).toEqual([]);
    expect(v.importedCustomers).toBe(1);
  });
  it("reports imported step text as needing confirmation", async () => {
    await writeFile(path.join(env.dir, "canvas/problem.md"), "---\nid: problem\ntext: Schedules are rebuilt by hand\nseeded: true\n---\n");
    const v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.step.needsConfirmation).toBe(true);
    expect(v.steps.find((step) => step.id === "you")?.needsConfirmation).toBe(false);
  });
  it("leaves imported advice out of the step's imported count", async () => {
    await createConversation({ type: "mentor", person: "Sam", org: null, date: "2026-10-12", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: [], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: [], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" }, { seeded: true, source: "chat import" });
    const v = await loadStep("customer");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.importedCustomers).toBe(0);
  });
  it("reports a step that isn't on the path", async () => {
    expect((await loadStep("nope")).status).toBe("missing");
  });
  it("lists this step's open planned conversations, this week's and carried, earliest due first", async () => {
    const later = await planConversation("2026-W42", "problem", { who: "Dana", due: "2026-10-16" });
    const carried = await planConversation("2026-W41", "problem", { who: "Lee", due: "2026-10-09" });
    await planConversation("2026-W42", "revenue", { who: "Ann", due: "2026-10-15" });
    const v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.planned).toEqual([
      { week: "2026-W41", id: carried, text: "Talk to Lee about Problem", due: "2026-10-09" },
      { week: "2026-W42", id: later, text: "Talk to Dana about Problem", due: "2026-10-16" },
    ]);
  });
  it("orders people newest first by when they talked, using the file date when the date is unknown", async () => {
    const base = { type: "customer" as const, org: null, segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["noted"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["problem"], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" };
    await createConversation({ ...base, person: "Ann", date: "2026-10-01" });
    await createConversation({ ...base, person: "Bea", date: "2026-10-10" });
    await createConversation({ ...base, person: "Cass", date: null }, {}, "2026-10-13");
    const v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.people.map((p) => p.person)).toEqual(["Cass", "Bea", "Ann"]);
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
  it("counts the founder's stances on the step and lists the challengers newest first; nothing until someone picks one", async () => {
    const base = { type: "customer" as const, org: null, segment: "Agency owner", context: null, questionsAsked: null, observedBehavior: null, quotes: ["noted"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["problem"], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" };
    const ann = await createConversation({ ...base, person: "Ann", date: "2026-10-01" });
    const bea = await createConversation({ ...base, person: "Bea", date: "2026-10-10" });
    const cass = await createConversation({ ...base, person: "Cass", date: "2026-10-05" });
    await createConversation({ ...base, person: "Dee", date: "2026-10-06" });
    let v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.step.discussed).toBe(4);
    expect(v.counts).toEqual({ supports: 0, challenges: 0 });
    expect(v.challengers).toEqual([]);
    await confirmWhatChanges(ann, "Owners don't feel it", "challenges");
    await confirmWhatChanges(bea, "Owners feel it weekly", "supports");
    await confirmWhatChanges(cass, "Scheduling isn't a problem once a tool is bought", "challenges");
    v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.step.discussed).toBe(4);
    expect(v.counts).toEqual({ supports: 1, challenges: 2 });
    expect(v.challengers.map((p) => [p.person, p.role, p.date, p.line, p.changed])).toEqual([
      ["Cass", "Agency owner", "2026-10-05", "noted", "Scheduling isn't a problem once a tool is bought"],
      ["Ann", "Agency owner", "2026-10-01", "noted", "Owners don't feel it"],
    ]);
  });
});
