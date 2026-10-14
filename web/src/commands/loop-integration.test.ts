// The core loop end to end (spec §15): design a test, link real customer evidence, complete it, and Today's next
// action is the commitment the founder chose. Run with and without a program.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { setCommitmentStatus } from "./checkin";
import { createConversation } from "./conversations";
import { DANA, PILOT } from "./test-inputs";
import { loadToday } from "./today";
import { formatToday } from "./today-text";
import { completeTest, createTest, linkEvidence } from "./venture-tests";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
  await setCommitmentStatus("2026-W42", "c-1", "done"); // the fixture's overdue commitment would otherwise come first
});
afterEach(() => env.cleanup());

const FORM = { result: "supported", evidenceStrength: "moderate", learning: "Owners pay to stop rebuilding schedules", decision: "continue", why: "Two of five signed", nextCommitment: "Onboard the two pilot agencies", nextCommitmentDue: "2026-10-16" };

async function runLoop() {
  const t = await createTest(PILOT, "2026-10-13");
  // Content-ful (notes, behavior, a quote, a number) and confirmed: written by the founder's own form, not an import.
  const c = await createConversation({ ...DANA, followUps: [] });
  await linkEvidence(t, c);
  const before = await loadToday();
  if (before.status !== "ready") throw new Error(before.status);
  expect(before.currentTest).toMatchObject({ path: t, evidenceCount: 1 });
  const { commitmentId } = await completeTest(t, FORM, "2026-10-13");
  const after = await loadToday();
  if (after.status !== "ready") throw new Error(after.status);
  return { t, commitmentId, after };
}

describe("the core loop", () => {
  it("create a test, link a confirmed customer conversation with content, complete it: Today's next is the test's next commitment", async () => {
    const { t, commitmentId, after } = await runLoop();
    expect(after.next).toMatchObject({ id: `commitment:2026-W42:${commitmentId}`, ref: commitmentId, kind: "commitment", tier: 7, label: FORM.nextCommitment, week: "2026-W42" });
    expect(after.checkin?.commitments.find((c) => c.id === commitmentId)).toMatchObject({ link: t, due: "2026-10-16", status: "open" });
    expect(after.currentTest).toBeNull();
  });

  it("works the same for a founder with no program: no program week, no program homework", async () => {
    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace(/^(programTitle|programStart|programWeeks|currentWeek):.*\n/gm, ""));
    const { commitmentId, after } = await runLoop();
    expect(after.founder.programTitle ?? null).toBeNull();
    expect(after.programWeek).toBeNull();
    expect(after.homework).toEqual([]);
    expect(after.next).toMatchObject({ id: `commitment:2026-W42:${commitmentId}`, tier: 7 });
    const text = formatToday(after);
    expect(text).not.toMatch(/Program week/);
    expect(text).toContain(`  ${FORM.nextCommitment} · due Fri (id ${commitmentId})`);
  });
});
