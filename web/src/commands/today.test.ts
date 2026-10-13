import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { slugOf } from "../core/slug";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { updateEntry } from "../store/update";
import { addCommitment, recordChoice, setCommitmentStatus, setOutcome } from "./checkin";
import { createConversation } from "./conversations";
import { confirmImportedRecord } from "./import";
import { DANA, MENTOR, PILOT } from "./test-inputs";
import { loadFounderToday, loadPromptContext, loadToday } from "./today";
import { abandonTest, completeTest, createTest, linkEvidence } from "./venture-tests";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

async function pinToday(date: string) {
  const file = path.join(env.dir, "founder.md");
  await writeFile(file, (await readFile(file, "utf8")).replace(/^today: .*$/m, `today: ${date}`));
}

async function ready() {
  const view = await loadToday();
  if (view.status !== "ready") throw new Error(view.status);
  return view;
}

describe("loadToday", () => {
  it("ranks this week's work and computes tomorrow on the server", async () => {
    await clearLoopRecords(env.dir);
    const view = await loadToday();
    expect(view).toMatchObject({ status: "ready", today: "2026-10-13", tomorrow: "2026-10-14", weekId: "2026-W42", weekStartsOn: "2026-10-12" });
    expect(view.status === "ready" && view.next?.id).toBe("commitment:2026-W42:c-1");
  });
  it("flags an impossible pinned today instead of crashing", async () => {
    await pinToday("2026-13-45");
    const view = await loadToday();
    expect(view).toMatchObject({ status: "flagged", path: "founder.md" });
    expect(view.status === "flagged" && view.error).toMatch(/^today: /);
  });
  it("keeps last week's deferral in force until its date", async () => {
    await clearLoopRecords(env.dir);
    // Last week's open commitment would carry into this week at tier 4; this test is about the deferral alone.
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await recordChoice("2026-W42", "2026-10-14", { actionId: "guide:problem-conversations", label: "Talk to five people", choice: "deferred", reason: "Conference week", until: "2026-10-21" });
    await recordChoice("2026-W42", "2026-10-14", { actionId: "fix:program/week-02.md", label: "Fix it", choice: "dismissed", reason: "Later" });
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    const view = await ready();
    expect(view.guide?.id).toBe("problem-conversations");
    // The deferral (until Wednesday) still hides the guide step this Monday; last week's dismissal no longer applies.
    expect(view.next?.id).toBe("fix:program/week-02.md");
    await pinToday("2026-10-21");
    const later = await loadToday();
    expect(later.status === "ready" && later.next?.id).toBe("guide:problem-conversations");
  });
  it("proposes no new guide step while a guide commitment is open, and seeds facts from evidence", async () => {
    await clearLoopRecords(env.dir);
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    await addCommitment("2026-W43", { text: "Talk to five people who have the problem", link: "guide:problem-conversations" });
    const view = await ready();
    expect(view.guide).toBeNull();
    expect(view.next).toMatchObject({ tier: 7, kind: "commitment", reason: "You committed to this step this week." });

    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("evidence: conversations", "evidence: paying-customers"));
    await mkdir(path.join(env.dir, "checkins"), { recursive: true });
    await writeFile(path.join(env.dir, "checkins/2026-W43.md"), "---\nweek: 2026-W43\noutcome: Book three demos\n---\n");
    const seeded = await loadToday();
    // Paying customers prove an offer was made, but not that five conversations were logged, so the guide
    // still asks for those rather than skipping ahead on a fabricated conversation count.
    expect(seeded.status === "ready" && seeded.guide?.id).toBe("problem-conversations");
  });
  it("sends a founder without setup to setup", async () => {
    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("setupComplete: true", "setupComplete: false"));
    expect(await loadToday()).toEqual({ status: "setup" });
  });
});

describe("loadToday with the loop", () => {
  beforeEach(() => clearLoopRecords(env.dir));

  it("resumes a running test first, then a due follow-up", async () => {
    const testRel = await createTest(PILOT, "2026-10-13");
    const convRel = await createConversation(DANA);
    let view = await ready();
    expect(view.next).toMatchObject({ id: `test:${testRel}`, tier: 3, href: `/tests/${slugOf(testRel)}` });
    expect(view.currentTest).toMatchObject({ path: testRel, title: PILOT.title, due: "2026-10-20" });
    await abandonTest(testRel, "Pricing changed", "2026-10-13");
    await setCommitmentStatus("2026-W42", "c-1", "done");
    view = await ready();
    expect(view.next).toMatchObject({ tier: 5, kind: "followup", href: `/conversations/${slugOf(convRel)}` });
    expect(view.followUps.map((f) => f.text)).toEqual(["Follow up with Dana Ortiz: Send the one-pager"]);
    expect(view.currentTest).toBeNull();
  });
  it("counts logged customer conversations on the guide step, not advice", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await createConversation({ ...DANA, followUps: [] });
    await createConversation({ ...DANA, person: "Lee Park", org: null, followUps: [] });
    await createConversation(MENTOR);
    const view = await ready();
    expect(view.next).toMatchObject({ id: "guide:problem-conversations", detail: "2 of 5 customer conversations logged" });
  });
  it("counts customer conversations on the current test, never advice", async () => {
    const testRel = await createTest(PILOT, "2026-10-13");
    await linkEvidence(testRel, await createConversation({ ...DANA, followUps: [] }));
    await linkEvidence(testRel, await createConversation(MENTOR));
    expect((await ready()).currentTest).toMatchObject({ linkedCount: 2, evidenceCount: 1 });
  });
  it("doesn't count an unconfirmed imported conversation as evidence on the current test or the guide step", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    const testRel = await createTest(PILOT, "2026-10-13");
    const imported = await createConversation({ ...DANA, followUps: [] }, { seeded: true, source: "chat import 2026-10-13 #abcd1234" });
    await linkEvidence(testRel, imported);
    expect((await ready()).currentTest).toMatchObject({ linkedCount: 1, evidenceCount: 0 });
    await confirmImportedRecord(imported);
    expect((await ready()).currentTest).toMatchObject({ linkedCount: 1, evidenceCount: 1 });
  });
  it("never resumes an imported test the founder hasn't confirmed (not tier 3), and leaves it out of the guide's test count", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    const testRel = await createTest(PILOT, "2026-10-13");
    await updateEntry("test", testRel, (data, body) => ({ data: { ...data!, seeded: true, source: "folder import 2026-10-13 #abc" }, body }));
    const view = await ready();
    expect(view.next?.tier).not.toBe(3);
    expect(view.currentTest).toBeNull();
    await confirmImportedRecord(testRel);
    expect((await ready()).next).toMatchObject({ tier: 3, id: `test:${testRel}` });
  });
  it("counts a content-free customer conversation on neither the current test nor the guide step", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    const testRel = await createTest(PILOT, "2026-10-13");
    await linkEvidence(testRel, await createConversation({ ...DANA, observedBehavior: null, quotes: [], numbers: [], followUps: [], notes: "" }));
    const view = await ready();
    expect(view.currentTest).toMatchObject({ linkedCount: 1, evidenceCount: 0 });
  });
  it("doesn't count a one-sided link on the current test", async () => {
    const testRel = await createTest(PILOT, "2026-10-13");
    const c = await createConversation({ ...DANA, followUps: [] });
    await updateEntry("test", testRel, (data, body) => ({ data: { ...data!, relatedConversations: [c] }, body }));
    expect((await ready()).currentTest).toMatchObject({ linkedCount: 0, evidenceCount: 0 });
  });
  it("counts planned tests separately from the current one", async () => {
    await createTest({ ...PILOT, startNow: false }, "2026-10-13");
    const view = await ready();
    expect(view).toMatchObject({ currentTest: null, plannedTests: 1 });
  });
  it("warns in one line when open commitments exceed the week's hours", async () => {
    for (const text of ["A", "B", "C", "D", "E"]) await addCommitment("2026-W42", { text });
    const view = await ready();
    expect(view.capacity).toBe("6 open items this week against the 15 hours you said you have. Does that fit?");
  });
});

describe("open commitments carry across weeks", () => {
  beforeEach(() => clearLoopRecords(env.dir));
  const W42 = "checkins/2026-W42.md";

  it("shows last week's open commitment on Monday, labelled with its week, ranked as if it were this week's", async () => {
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    const view = await ready();
    expect(view.weekId).toBe("2026-W43");
    expect(view.carried).toEqual([expect.objectContaining({ id: "c-1", week: "2026-W42", status: "open" })]);
    // c-1 was due 2026-10-12, so it's overdue: tier 4, like an overdue commitment made this week.
    expect(view.next).toMatchObject({ id: "commitment:2026-W42:c-1", ref: "c-1", tier: 4, week: "2026-W42" });
  });
  it("ranks a carried commitment that isn't overdue at tier 6, and a test's next commitment at tier 7", async () => {
    await addCommitment("2026-W42", { text: "Call the meetup host", due: "2026-10-23" });
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    expect((await ready()).next).toMatchObject({ tier: 6, label: "Call the meetup host", week: "2026-W42" });
  });
  it("a Friday completion with next week's due date still shows on Monday; marking it done updates the original week's file", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await pinToday("2026-10-16"); // Friday of 2026-W42
    const t = await createTest(PILOT, "2026-10-13");
    await linkEvidence(t, await createConversation({ ...DANA, followUps: [] }));
    const form = { result: "supported", evidenceStrength: "moderate", learning: "Two signed", decision: "continue", why: "Price held", nextCommitment: "Onboard the two pilots", nextCommitmentDue: "2026-10-20" };
    const { commitmentId } = await completeTest(t, form, "2026-10-16");

    await pinToday("2026-10-19"); // Monday of 2026-W43
    await setOutcome("2026-W43", "Onboard pilots");
    const monday = await ready();
    expect(monday.next).toMatchObject({ id: `commitment:2026-W42:${commitmentId}`, tier: 7, week: "2026-W42", label: "Onboard the two pilots" });
    // Repeating the completion on Monday finds it in the closing week instead of copying it into this one.
    expect(await completeTest(t, form, "2026-10-19")).toEqual({ commitmentId, alreadyComplete: true });
    expect((await readEntry("checkin", "checkins/2026-W43.md"))?.ok && (await ready()).checkin?.commitments).toEqual([]);

    // Today's action passes the commitment's own week, so "done" lands in the file it lives in.
    await setCommitmentStatus(monday.next!.week!, monday.next!.ref!, "done");
    const w42 = await readEntry("checkin", W42);
    expect(w42?.ok && w42.data.commitments.find((c) => c.id === commitmentId)?.status).toBe("done");
    const after = await ready();
    expect(after.carried).toEqual([]);
    expect(after.next?.id).not.toBe(`commitment:2026-W42:${commitmentId}`);
  });
  it("writes to the file a carried commitment lives in, even with duplicate ids across weeks and a mismatched week field", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    const dir = path.join(env.dir, "checkins");
    // Same local id in two weeks; the W41 file's week field wrongly says W40.
    await writeFile(path.join(dir, "2026-W40.md"), "---\nweek: 2026-W40\ncommitments:\n  - id: c-9\n    text: Forty\n    due: 2026-10-01\n    status: open\n---\n");
    await writeFile(path.join(dir, "2026-W41.md"), "---\nweek: 2026-W40\ncommitments:\n  - id: c-9\n    text: Forty-one\n    due: 2026-10-08\n    status: open\n---\n");
    const view = await ready();
    expect(view.carried.map((c) => [c.text, c.week])).toEqual([
      ["Forty", "2026-W40"],
      ["Forty-one", "2026-W41"],
    ]);
    const fortyOne = view.carried.find((c) => c.text === "Forty-one")!;
    await setCommitmentStatus(fortyOne.week, fortyOne.id, "done");
    const w40 = await readEntry("checkin", "checkins/2026-W40.md");
    const w41 = await readEntry("checkin", "checkins/2026-W41.md");
    expect(w40?.ok && w40.data.commitments[0].status).toBe("open");
    expect(w41?.ok && w41.data.commitments[0].status).toBe("done");
  });
  it("keeps identical ids in two carried weeks apart, each with its own Not now choice", async () => {
    await setCommitmentStatus("2026-W42", "c-1", "done");
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    const dir = path.join(env.dir, "checkins");
    await writeFile(path.join(dir, "2026-W40.md"), "---\nweek: 2026-W40\ncommitments:\n  - id: c-9\n    text: Forty\n    due: 2026-10-01\n    status: open\n---\n");
    await writeFile(path.join(dir, "2026-W41.md"), "---\nweek: 2026-W41\ncommitments:\n  - id: c-9\n    text: Forty-one\n    due: 2026-10-08\n    status: open\n---\n");
    const first = await ready();
    expect(first.next).toMatchObject({ id: "commitment:2026-W40:c-9", ref: "c-9", week: "2026-W40", label: "Forty" });
    await recordChoice("2026-W43", "2026-10-19", { actionId: first.next!.id, label: "Forty", choice: "dismissed", reason: "Not this week" });
    // Only W40's c-9 is hidden; W41's c-9 is a different action.
    const second = await ready();
    expect(second.next).toMatchObject({ id: "commitment:2026-W41:c-9", week: "2026-W41", label: "Forty-one" });
    await recordChoice("2026-W43", "2026-10-19", { actionId: second.next!.id, label: "Forty-one", choice: "deferred", reason: "Later", until: "2026-10-21" });
    expect((await ready()).next?.id).not.toMatch(/^commitment:2026-W4[01]:c-9$/);
  });
  it("never carries a commitment forward from a later week, or a done or dropped one", async () => {
    await addCommitment("2026-W43", { text: "Next week's thing" });
    await addCommitment("2026-W41", { text: "Dropped one" }).then((id) => setCommitmentStatus("2026-W41", id, "dropped", "No longer relevant"));
    const view = await ready();
    expect(view.carried.map((c) => [c.text, c.week])).toEqual([]);
  });
});

describe("the fixture's loop", () => {
  it("resumes the running pilot before the overdue commitment and the due follow-up", async () => {
    const view = await ready();
    expect(view.next?.id).toBe("test:tests/2026-10-06-paid-pilot.md");
    expect(view.currentTest).toMatchObject({ slug: "2026-10-06-paid-pilot", linkedCount: 1, evidenceCount: 1, evidenceStrength: "weak" });
  });
});

describe("loadFounderToday", () => {
  it("uses the date pinned in founder.md", async () => expect(await loadFounderToday()).toBe("2026-10-13"));
  it("falls back to the local date without founder.md", async () => {
    await rm(path.join(env.dir, "founder.md"));
    expect(await loadFounderToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("loadPromptContext", () => {
  it("fills the data folder, venture and today on the server", async () =>
    expect(await loadPromptContext()).toEqual({ dataDir: env.dir, venture: "Lantern", today: "2026-10-13" }));
});
