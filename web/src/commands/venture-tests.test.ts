import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { slugOf } from "../core/slug";
import type { CompletionForm } from "../core/venture-tests";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { updateEntry } from "../store/update";
import { createConversation } from "./conversations";
import { DANA, PILOT } from "./test-inputs";
import {
  abandonTest,
  completeTest,
  createTest,
  linkEvidence,
  loadTest,
  loadTests,
  parseTestForm,
  saveEvidenceNotes,
  setEvidenceStrength,
  startTest,
  TEST_BODY,
  unlinkEvidence,
} from "./venture-tests";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
});
afterEach(() => env.cleanup());

const TODAY = "2026-10-13";
const PILOT_PATH = "tests/2026-10-13-ask-agency-owners-to-pay-for-a-scheduling-pilot.md";
const GONE = "conversations/2026-10-01-gone.md";
const complete = (extra: Partial<CompletionForm> = {}): CompletionForm => ({
  result: "supported",
  evidenceStrength: "moderate",
  learning: "Two owners signed",
  decision: "continue",
  why: "The price held",
  nextCommitment: "Onboard the two pilots",
  nextCommitmentDue: "2026-10-20",
  ...extra,
});
const testData = async (rel: string) => {
  const e = await readEntry("test", rel);
  if (!e?.ok) throw new Error(`can't read ${rel}`);
  return e;
};

describe("parseTestForm", () => {
  it("needs success and failure criteria before the test exists", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ title: "Pilot", area: "revenue", belief: "They'll pay", test: "Offer it", successCriteria: "", failureCriteria: "", startNow: "on" })) fd.set(k, v);
    const r = parseTestForm(fd);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["failureCriteria", "successCriteria"]);
  });
});

describe("venture test commands", () => {
  it("creates a running test with the three body sections", async () => {
    expect(await createTest(PILOT, TODAY)).toBe(PILOT_PATH);
    const e = await testData(PILOT_PATH);
    expect(e.data).toMatchObject({ status: "running", startedOn: TODAY, evidenceStrength: "none", result: null, decision: null });
    expect(e.body).toBe(TEST_BODY);
  });
  it("starts a planned test once", async () => {
    const rel = await createTest({ ...PILOT, startNow: false }, TODAY);
    expect((await testData(rel)).data.status).toBe("planned");
    await startTest(rel, "2026-10-14");
    expect((await testData(rel)).data).toMatchObject({ status: "running", startedOn: "2026-10-14" });
    await expect(startTest(rel, "2026-10-14")).rejects.toThrow(/planned/);
  });
  it("links a conversation as evidence on both records, once, and unlinks both", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(t, c);
    await linkEvidence(t, c);
    expect((await testData(t)).data.relatedConversations).toEqual([c]);
    const conv = await readEntry("conversation", c);
    expect(conv?.ok && conv.data.relatedTests).toEqual([t]);
    await unlinkEvidence(t, c);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
    const after = await readEntry("conversation", c);
    expect(after?.ok && after.data.relatedTests).toEqual([]);
  });
  it("refuses to link to a record that isn't there, changing neither side", async () => {
    const t = await createTest(PILOT, TODAY);
    await expect(linkEvidence(t, GONE)).rejects.toThrow(/isn't there/);
    await expect(linkEvidence(t, "")).rejects.toThrow(/Pick a test and a conversation/);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
  });
  it("undoes only its own half when the second write fails", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    const fail = () => {
      throw new Error("disk full");
    };
    await expect(linkEvidence(t, c, { beforeSecondWrite: fail })).rejects.toThrow(/disk full/);
    const conv = await readEntry("conversation", c);
    expect(conv?.ok && conv.data.relatedTests).toEqual([]);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
  });
  it("keeps a link that was already there when the second write fails", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await updateEntry("conversation", c, (data, body) => ({ data: { ...data!, relatedTests: [t] }, body }));
    await expect(linkEvidence(t, c, { beforeSecondWrite: () => { throw new Error("disk full"); } })).rejects.toThrow(/disk full/);
    const conv = await readEntry("conversation", c);
    expect(conv?.ok && conv.data.relatedTests).toEqual([t]);
  });
  it("reports the original error when the undo fails, and a repeat call repairs the one-sided link", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await expect(
      linkEvidence(t, c, {
        beforeSecondWrite: () => {
          throw new Error("disk full");
        },
        beforeRollback: () => {
          throw new Error("undo failed");
        },
      }),
    ).rejects.toThrow(/disk full/);
    const oneSided = await readEntry("conversation", c);
    expect(oneSided?.ok && oneSided.data.relatedTests).toEqual([t]);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
    await linkEvidence(t, c);
    expect((await testData(t)).data.relatedConversations).toEqual([c]);
    const repaired = await readEntry("conversation", c);
    expect(repaired?.ok && repaired.data.relatedTests).toEqual([t]);
  });
  it("unlinks a broken link from the side that still exists", async () => {
    const t = await createTest(PILOT, TODAY);
    await updateEntry("test", t, (data, body) => ({ data: { ...data!, relatedConversations: [GONE] }, body }));
    await unlinkEvidence(t, GONE);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
  });
  it("sets evidence strength from the founder's choice", async () => {
    const t = await createTest(PILOT, TODAY);
    await expect(setEvidenceStrength(t, "huge")).rejects.toThrow(/strong/);
    await setEvidenceStrength(t, "weak");
    expect((await testData(t)).data.evidenceStrength).toBe("weak");
  });
  it("saves evidence notes into the Evidence section", async () => {
    const t = await createTest(PILOT, TODAY);
    await saveEvidenceNotes(t, "Dana said yes in principle");
    expect((await testData(t)).body).toContain("## Evidence\n\nDana said yes in principle\n\n## What we learned");
  });
  it("completes with a separate result and decision, writes the learning, and adds the next commitment to this week", async () => {
    const t = await createTest(PILOT, TODAY);
    await expect(completeTest(t, complete({ evidenceStrength: "none" }), TODAY)).rejects.toThrow(/inconclusive/);
    const { commitmentId } = await completeTest(t, complete({ decision: "revise", why: "The price held, onboarding didn't" }), TODAY);
    const e = await testData(t);
    expect(e.data).toMatchObject({ status: "complete", result: "supported", decision: "revise", evidenceStrength: "moderate", closedOn: TODAY, nextCommitment: "Onboard the two pilots" });
    expect(e.body).toContain("## What we learned\n\nTwo owners signed\n");
    expect(e.body).toContain("## Decision and why\n\n**Revise.** The price held, onboarding didn't\n");
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.find((c) => c.id === commitmentId)).toMatchObject({ text: "Onboard the two pilots", due: "2026-10-20", status: "open", link: t });
    // Repeating is safe: no second commitment.
    expect(await completeTest(t, complete(), TODAY)).toEqual({ commitmentId });
    const again = await readEntry("checkin", "checkins/2026-W42.md");
    expect(again?.ok && again.data.commitments.filter((c) => c.link === t)).toHaveLength(1);
  });
  it("never strands the next commitment: completing again adds it once the check-in can be saved", async () => {
    const t = await createTest(PILOT, TODAY);
    const file = path.join(env.dir, "checkins/2026-W42.md");
    const good = await readFile(file, "utf8");
    await writeFile(file, "---\nweek: nope\n---\n");
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(/saved as complete/);
    expect((await testData(t)).data.status).toBe("complete");
    await writeFile(file, good);
    const { commitmentId } = await completeTest(t, complete(), TODAY);
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.filter((c) => c.link === t).map((c) => c.id)).toEqual([commitmentId]);
  });
  it("still refuses to complete a test that was stopped early", async () => {
    const t = await createTest(PILOT, TODAY);
    await abandonTest(t, "Pricing changed", TODAY);
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(/already closed/);
  });
  it("a stop decision may end without a next commitment", async () => {
    const t = await createTest(PILOT, TODAY);
    expect(await completeTest(t, complete({ result: "contradicted", decision: "stop", why: "Nobody would pay", nextCommitment: "", nextCommitmentDue: "" }), TODAY)).toEqual({ commitmentId: null });
    expect((await testData(t)).data).toMatchObject({ decision: "stop", nextCommitment: null });
  });
  it("allows an inconclusive result with no evidence", async () => {
    const t = await createTest(PILOT, TODAY);
    await completeTest(t, complete({ result: "inconclusive", evidenceStrength: "none", decision: "pause" }), TODAY);
    expect((await testData(t)).data).toMatchObject({ result: "inconclusive", decision: "pause" });
  });
  it("stops a test early only with a reason", async () => {
    const t = await createTest(PILOT, TODAY);
    await expect(abandonTest(t, " ", TODAY)).rejects.toThrow(/fine reason/);
    await abandonTest(t, "Pricing changed", TODAY);
    expect((await testData(t)).data).toMatchObject({ status: "abandoned", abandonReason: "Pricing changed", closedOn: TODAY });
  });
});

describe("test views", () => {
  it("groups tests and loads one with its sections and linked conversations", async () => {
    const running = await createTest(PILOT, TODAY);
    const planned = await createTest({ ...PILOT, title: "Find agencies in a directory", startNow: false }, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(running, c);
    const list = await loadTests();
    expect(list.running.map((r) => r.path)).toEqual([running]);
    expect(list.planned.map((r) => r.path)).toEqual([planned]);
    const v = await loadTest(slugOf(running));
    expect(v.status === "ready" && v.linked.map((x) => x.path)).toEqual([c]);
    expect(v.status === "ready" && v.sections).toEqual({ plan: "", evidence: "", learning: "", decisionWhy: "" });
    expect(await loadTest("nope")).toEqual({ status: "missing" });
  });
});

describe("the next commitment is added exactly once", () => {
  it("two repeat completions at the same moment add it once", async () => {
    const t = await createTest(PILOT, TODAY);
    const file = path.join(env.dir, "checkins/2026-W42.md");
    const good = await readFile(file, "utf8");
    await writeFile(file, "---\nweek: nope\n---\n");
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(/saved as complete/);
    await writeFile(file, good);
    const [a, b] = await Promise.all([completeTest(t, complete(), TODAY), completeTest(t, complete(), TODAY)]);
    expect(a).toEqual(b);
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.filter((c) => c.link === t)).toHaveLength(1);
  });
  it("repeating in a later week doesn't add it again when the closing week already has it", async () => {
    const t = await createTest(PILOT, TODAY);
    const { commitmentId } = await completeTest(t, complete(), TODAY);
    expect(await completeTest(t, complete(), "2026-10-21")).toEqual({ commitmentId });
    expect(await readEntry("checkin", "checkins/2026-W43.md")).toBeNull();
  });
});
