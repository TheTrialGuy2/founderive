import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { bumpOutreach, setTalkGoal } from "./checkin";
import { createConversation } from "./conversations";
import { markStepDone } from "./path";
import { loadToday } from "./today";
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
  it("counts people talked to this week against the goal, with outreach", async () => {
    await talk("2026-10-12", ["problem"]);
    await setTalkGoal("2026-W42", "4");
    await bumpOutreach("2026-W42", "reached");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.talkedTo).toMatchObject({ count: 1, goal: 4, reached: 1, replied: 0 });
    expect(v.path.steps.find((s) => s.id === "problem")?.discussed).toBe(1);
  });
  it("uses the founder default goal of 3, and says how short last week came in", async () => {
    await talk("2026-10-06");
    const v = await loadToday();
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.talkedTo.goal).toBe(3);
    expect(v.talkedTo.lastWeekShort).toBe(2);
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
});
