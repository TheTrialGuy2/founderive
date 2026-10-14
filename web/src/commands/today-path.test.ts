import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { mkdir, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { bumpOutreach, loadCheckin, setCommitmentStatus, setTalkGoal } from "./checkin";
import { createConversation } from "./conversations";
import { findPlannedConversation, markPlannedConversationDone, markStepDone, planConversation } from "./path";
import { assertThisWeek, loadToday } from "./today";
import { formatToday } from "./today-text";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir); // counts below depend only on what each test logs
});
afterEach(() => env.cleanup());

const talk = (date: string, areas: string[] = []) =>
  createConversation({ type: "customer", person: "Maya", org: null, date, segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["I rebuild it every Sunday"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas, followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" });

describe("loadToday path fields", () => {
  it("counts imported conversations waiting to be confirmed, names them as the main action, and says so in the text", async () => {
    const imported = (person: string) =>
      createConversation({ type: "customer", person, org: null, date: "2026-10-12", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["I rebuild it every Sunday"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: [], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" }, { seeded: true, source: "chat import" });
    await imported("Maya");
    await imported("Lee");
    await setCommitmentStatus("2026-W42", "c-1", "done"); // the fixture's past-due commitment would be the main action
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.importedWaiting).toBe(2);
    expect(v.talkedTo.count).toBe(0); // they don't count until confirmed
    expect(v.action).toMatchObject({ kind: "imports", label: "Review 2 imported conversations", href: "/people?show=imported" });
    const text = formatToday(v);
    expect(text).toMatch(/^Main action: Review 2 imported conversations/m);
    expect(text).toMatch(/^Imported, waiting for you: 2 conversations$/m);
  });
  it("counts imported advice too, since every import waits for the founder", async () => {
    await createConversation({ type: "mentor", person: "Sam", org: null, date: "2026-10-12", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: [], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: [], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "Talk to agencies" }, { seeded: true, source: "chat import" });
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.importedWaiting).toBe(1);
  });
  it("says nothing about imports when none wait", async () => {
    await talk("2026-10-12");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.importedWaiting).toBe(0);
    expect(formatToday(v)).not.toMatch(/Imported, waiting/);
  });
  it("counts people talked to this week against the goal, with outreach", async () => {
    await talk("2026-10-12", ["problem"]);
    await setTalkGoal("2026-W42", "4");
    await bumpOutreach("2026-W42", "reached");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.talkedTo).toMatchObject({ count: 1, goal: 4, reached: 1, replied: 0 });
    expect(v.path.steps.find((s) => s.id === "problem")?.discussed).toBe(1);
  });
  it("uses the founder default goal of 3, and counts last week's shortfall when last week has a check-in", async () => {
    await talk("2026-10-06");
    await mkdir(nodePath.join(env.dir, "checkins"), { recursive: true });
    await writeFile(nodePath.join(env.dir, "checkins/2026-W41.md"), "---\nweek: 2026-W41\ncommitments: []\n---\n");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.talkedTo.goal).toBe(3);
    expect(v.talkedTo.lastWeekShort).toBe(2);
    expect(formatToday(v)).not.toMatch(/short/i);
  });
  it("counts no shortfall for a founder with no earlier check-in", async () => {
    await talk("2026-10-06");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.talkedTo.lastWeekShort).toBe(0);
  });
  it("lists follow-ups due with the commitments, and keeps the text's Follow-ups due lines", async () => {
    await createConversation({ type: "customer", person: "Lee", org: null, date: "2026-10-05", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["noted"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: [], followUps: [{ text: "Send the price", due: "2026-10-09" }], whatChanges: null, whatChangesConfirmed: false, notes: "" });
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    const f = v.dueItems.find((d) => d.kind === "followup");
    expect(f).toMatchObject({ text: "Follow up with Lee: Send the price", due: "2026-10-09", href: expect.stringMatching(/^\/conversations\//) });
    expect(f?.id).toMatch(/^conversations\/.+\.md#.+/);
    // It's the earliest item past its date, so it's the main action.
    expect(v.action).toMatchObject({ kind: "overdue", key: f?.key });
    expect(formatToday(v)).toMatch(/Follow-ups due:\n  Follow up with Lee: Send the price/);
  });
  it("names the same main action in the view and the text", async () => {
    // The fixture's c-1 was due 2026-10-12 and today is pinned to 2026-10-13, so it comes first.
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.action).toMatchObject({ kind: "overdue", label: "Email the two agencies from the meetup" });
    const text = formatToday(v);
    expect(text).toMatch(/^Main action: Email the two agencies from the meetup/m);
    expect(text).toMatch(/Logged this week: 0 · your goal: 3/);
    expect(text).not.toMatch(/overdue/i);
  });
  it("moves the current step forward when one is marked done", async () => {
    await markStepDone("customer", "", "2026-10-13");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.path.current?.id).toBe("problem");
  });
  it("names the answer, not a conversation, when the current step isn't Customer", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done"); // the fixture's past-due commitment would be the main action
    await markStepDone("customer", "", "2026-10-13");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.action).toMatchObject({ kind: "step", stepId: "problem", mode: "open", label: "Continue: Problem", reason: "Work on your answer, then mark it done." });
    const text = formatToday(v);
    expect(text).toMatch(/^Main action: Continue: Problem$/m);
    expect(text).toMatch(/^Path: Problem \(step \d+ of \d+\)$/m); // nobody discussed it, and that isn't this step's job
  });
});

describe("a page from an earlier week", () => {
  it("refuses a week that isn't this week, and accepts this one", async () => {
    await expect(assertThisWeek("2026-W41")).rejects.toThrow("This page is from an earlier week. Reload to see this week.");
    await expect(assertThisWeek("")).rejects.toThrow(/earlier week/);
    await expect(assertThisWeek("2026-W42")).resolves.toBeUndefined();
  });
});

describe("closing a planned conversation", () => {
  const log = (type: "customer" | "mentor", plan: string | null) =>
    createConversation({ type, person: "Dana", org: null, date: "2026-10-13", segment: null, context: null, questionsAsked: null, observedBehavior: null, quotes: ["I rebuild it every Sunday"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["customer"], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" }).then(() => (plan ? markPlannedConversationDone(plan) : undefined));

  beforeEach(async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done"); // the fixture's past-due commitment would be the main action
  });

  it("finds an open planned conversation by week and id, and ignores anything else", async () => {
    const id = await planConversation("2026-W42", "customer", { who: "Dana", due: "2026-10-15" });
    expect(await findPlannedConversation(`2026-W42:${id}`)).toEqual({ week: "2026-W42", id, text: "Talk to Dana about Customer" });
    expect(await findPlannedConversation(`2026-W42:nope`)).toBeNull();
    expect(await findPlannedConversation(`../x:${id}`)).toBeNull();
    expect(await findPlannedConversation("2026-W42:c-1")).toBeNull(); // not open, and not a planned conversation
    expect(await findPlannedConversation("")).toBeNull();
  });
  it("marks the plan done when a feedback conversation is logged with it, so Home moves on", async () => {
    const id = await planConversation("2026-W42", "customer", { who: "Dana", due: "2026-10-15" });
    let v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.action).toMatchObject({ kind: "step", stepId: "customer", mode: "log" });
    await log("customer", `2026-W42:${id}`);
    expect((await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id)?.status).toBe("done");
    v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.action).toMatchObject({ kind: "step", stepId: "customer", mode: "open" });
  });
  it("goes back to planning when the logged conversation doesn't count", async () => {
    const id = await planConversation("2026-W42", "customer", { who: "a mentor", due: "2026-10-15" });
    await log("mentor", `2026-W42:${id}`);
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.action).toMatchObject({ kind: "step", stepId: "customer", mode: "plan" });
  });
  it("leaves the plan open when it's ignored or invalid", async () => {
    const id = await planConversation("2026-W42", "customer", { who: "Dana", due: "2026-10-15" });
    await markPlannedConversationDone("2026-W42:nope");
    await markPlannedConversationDone("garbage");
    expect((await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id)?.status).toBe("open");
  });
});
