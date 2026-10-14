import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";
import { bumpOutreach, chooseFocus, loadCheckin, setOutreach, setTalkGoal } from "./checkin";
import { markStepDone, planConversation, reopenStep } from "./path";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("path commands", () => {
  it("marks a step done with an optional reason, and reopens it with the answer kept", async () => {
    await markStepDone("customer", "  Three owners matched the description ", "2026-10-14");
    let e = await readEntry("canvasBlock", "canvas/customer.md");
    expect(e?.ok && e.data).toMatchObject({ done: "2026-10-14", doneReason: "Three owners matched the description" });
    const text = e?.ok ? e.data.text : "";
    await reopenStep("customer");
    e = await readEntry("canvasBlock", "canvas/customer.md");
    expect(e?.ok && e.data).toMatchObject({ done: null, doneReason: null, text });
  });
  it("marks a step with no canvas file yet done", async () => {
    await markStepDone("revenue", "", "2026-10-14");
    const e = await readEntry("canvasBlock", "canvas/revenue.md");
    expect(e?.ok && e.data).toMatchObject({ id: "revenue", done: "2026-10-14", doneReason: null, text: "" });
  });
  it("refuses a step that isn't on the path", async () => {
    await expect(markStepDone("nope", "", "2026-10-14")).rejects.toThrow(/isn't a step/);
    await expect(markStepDone("you", "", "2026-10-14")).rejects.toThrow(/isn't a step/);
  });
  it("plans a conversation as a commitment linked to the step", async () => {
    const id = await planConversation("2026-W42", "problem", { who: "an agency owner from the meetup", due: "2026-10-16" });
    const c = (await loadCheckin("2026-W42")).data.commitments.find((x) => x.id === id);
    expect(c).toMatchObject({ text: "Talk to an agency owner from the meetup about Problem", due: "2026-10-16", status: "open", link: "step:problem" });
  });
  it("refuses a planned conversation without who or a day, or with contact details", async () => {
    await expect(planConversation("2026-W42", "problem", { who: " ", due: "2026-10-16" })).rejects.toThrow(/who/i);
    await expect(planConversation("2026-W42", "problem", { who: "Dana", due: "" })).rejects.toThrow(/day/i);
    await expect(planConversation("2026-W42", "problem", { who: "dana@example.com", due: "2026-10-16" })).rejects.toThrow();
  });
});

describe("check-in effort fields", () => {
  it("adds one to reached or replied, starting from zero", async () => {
    await bumpOutreach("2026-W42", "reached");
    await bumpOutreach("2026-W42", "reached");
    await bumpOutreach("2026-W42", "replied");
    expect((await loadCheckin("2026-W42")).data.outreach).toEqual({ reached: 2, replied: 1 });
    await expect(bumpOutreach("2026-W42", "sent")).rejects.toThrow();
  });
  it("corrects outreach by hand; replied may exceed reached", async () => {
    await setOutreach("2026-W42", "3", "5");
    expect((await loadCheckin("2026-W42")).data.outreach).toEqual({ reached: 3, replied: 5 });
    await expect(setOutreach("2026-W42", "-1", "0")).rejects.toThrow(/whole number/);
  });
  it("sets this week's talk goal", async () => {
    await setTalkGoal("2026-W42", "4");
    expect((await loadCheckin("2026-W42")).data.talkGoal).toBe(4);
    await expect(setTalkGoal("2026-W42", "0")).rejects.toThrow(/1 and 50/);
  });
  it("chooses this week's focus from the canvas steps", async () => {
    await chooseFocus("2026-W42", "revenue");
    expect((await loadCheckin("2026-W42")).data.focus).toBe("revenue");
    await expect(chooseFocus("2026-W42", "nope")).rejects.toThrow(/isn't a step/);
  });
  it("keeps the outcome and commitments when changing these", async () => {
    await bumpOutreach("2026-W42", "reached");
    const { data } = await loadCheckin("2026-W42");
    expect(data.outcome).toBe("Talk to five agency owners about scheduling");
    expect(data.commitments.length).toBe(2);
  });
});
