import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { slugOf } from "../core/slug";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { addCommitment, recordChoice, setCommitmentStatus, setOutcome } from "./checkin";
import { createConversation } from "./conversations";
import { confirmImportedRecord } from "./import";
import { DANA, MENTOR, PILOT } from "./test-inputs";
import { loadFounderToday, loadPromptContext, loadToday } from "./today";
import { abandonTest, createTest, linkEvidence } from "./venture-tests";

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
    expect(view.status === "ready" && view.next?.id).toBe("commitment:c-1");
  });
  it("flags an impossible pinned today instead of crashing", async () => {
    await pinToday("2026-13-45");
    const view = await loadToday();
    expect(view).toMatchObject({ status: "flagged", path: "founder.md" });
    expect(view.status === "flagged" && view.error).toMatch(/^today: /);
  });
  it("keeps last week's deferral in force until its date", async () => {
    await clearLoopRecords(env.dir);
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
