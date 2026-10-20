import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { slugOf } from "../core/slug";
import type { CompletionForm } from "../core/venture-tests";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { updateEntry } from "../store/update";
import { createConversation } from "./conversations";
import { confirmImportedRecord } from "./import";
import { DANA, MENTOR, PILOT } from "./test-inputs";
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
const NOTES = "Two owners signed the pilot form by email on 2026-10-12";
const withNotes = (rel: string) => saveEvidenceNotes(rel, NOTES);
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
    await linkEvidence(t, await createConversation(DANA));
    await expect(completeTest(t, complete({ evidenceStrength: "none" }), TODAY)).rejects.toThrow(/inconclusive/);
    const { commitmentId } = await completeTest(t, complete({ decision: "revise", why: "The price held, onboarding didn't" }), TODAY);
    const e = await testData(t);
    expect(e.data).toMatchObject({ status: "complete", result: "supported", decision: "revise", evidenceStrength: "moderate", closedOn: TODAY, nextCommitment: "Onboard the two pilots" });
    expect(e.body).toContain("## What we learned\n\nTwo owners signed\n");
    expect(e.body).toContain("## Decision and why\n\n**Revise.** The price held, onboarding didn't\n");
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.find((c) => c.id === commitmentId)).toMatchObject({ text: "Onboard the two pilots", due: "2026-10-20", status: "open", link: t });
    // Repeating is safe: no second commitment.
    expect(await completeTest(t, complete(), TODAY)).toEqual({ commitmentId, alreadyComplete: true });
    const again = await readEntry("checkin", "checkins/2026-W42.md");
    expect(again?.ok && again.data.commitments.filter((c) => c.link === t)).toHaveLength(1);
  });
  it("lists the commitment written when the test was completed, with its status", async () => {
    const t = await createTest(PILOT, TODAY);
    await linkEvidence(t, await createConversation(DANA));
    const { commitmentId } = await completeTest(t, complete(), TODAY);
    const view = await loadTest(slugOf(t));
    expect(view.status === "ready" && view.commitments).toEqual([{ week: "2026-W42", id: commitmentId, text: "Onboard the two pilots", due: "2026-10-20", status: "open", reason: null }]);
  });
  it("never strands the next commitment: completing again adds it once the check-in can be saved", async () => {
    const t = await createTest(PILOT, TODAY);
    await withNotes(t);
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
    await withNotes(t);
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
    await withNotes(t);
    const file = path.join(env.dir, "checkins/2026-W42.md");
    const good = await readFile(file, "utf8");
    await writeFile(file, "---\nweek: nope\n---\n");
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(/saved as complete/);
    await writeFile(file, good);
    const [sa, sb] = await Promise.allSettled([completeTest(t, complete(), TODAY), completeTest(t, complete(), TODAY)]);
    if (sa.status === "rejected" || sb.status === "rejected") throw new Error("both completions should resolve");
    expect(sa.value).toEqual(sb.value);
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.filter((c) => c.link === t)).toHaveLength(1);
  });
  it("repeating in a later week doesn't add it again when the closing week already has it", async () => {
    const t = await createTest(PILOT, TODAY);
    await withNotes(t);
    const { commitmentId } = await completeTest(t, complete(), TODAY);
    expect(await completeTest(t, complete(), "2026-10-21")).toEqual({ commitmentId, alreadyComplete: true });
    expect(await readEntry("checkin", "checkins/2026-W43.md")).toBeNull();
  });
});

describe("a clear result needs real evidence", () => {
  const CLEAR = /Link a customer or prospect conversation, or describe the evidence and where it came from, before marking it supported/;
  it("refuses supported or contradicted with no links and no evidence notes, changing nothing", async () => {
    const t = await createTest(PILOT, TODAY);
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(CLEAR);
    await expect(completeTest(t, complete({ result: "contradicted" }), TODAY)).rejects.toThrow(/before marking it contradicted/);
    expect((await testData(t)).data).toMatchObject({ status: "running", result: null, decision: null });
  });
  it("never counts advice as evidence", async () => {
    const t = await createTest(PILOT, TODAY);
    await linkEvidence(t, await createConversation(MENTOR));
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(CLEAR);
  });
  it("never counts a broken link as evidence", async () => {
    const t = await createTest(PILOT, TODAY);
    await updateEntry("test", t, (data, body) => ({ data: { ...data!, relatedConversations: [GONE] }, body }));
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(CLEAR);
  });
  it("doesn't count an unconfirmed imported conversation until the founder confirms it", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA, { seeded: true, source: "chat import 2026-10-13 #abcd1234" });
    await linkEvidence(t, c);
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(CLEAR);
    const view = await loadTest(slugOf(t));
    expect(view.status === "ready" && view.linked.map((x) => x.seeded)).toEqual([true]);
    await confirmImportedRecord(c);
    await completeTest(t, complete(), TODAY);
    expect((await testData(t)).data).toMatchObject({ status: "complete", result: "supported" });
  });
  it("allows it with one linked customer conversation", async () => {
    const t = await createTest(PILOT, TODAY);
    await linkEvidence(t, await createConversation(DANA));
    await completeTest(t, complete(), TODAY);
    expect((await testData(t)).data).toMatchObject({ status: "complete", result: "supported" });
  });
  it("allows it with the founder's own description of the evidence", async () => {
    const t = await createTest(PILOT, TODAY);
    await withNotes(t);
    await completeTest(t, complete({ result: "contradicted", decision: "revise" }), TODAY);
    expect((await testData(t)).data).toMatchObject({ status: "complete", result: "contradicted" });
  });
});

describe("evidence must record something, and both records must link", () => {
  const EMPTY = { ...DANA, observedBehavior: null, quotes: [], numbers: [], followUps: [], notes: "" };
  it("a reciprocal, confirmed, content-free customer conversation doesn't count toward completion", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(EMPTY);
    await linkEvidence(t, c);
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(/Link a customer or prospect conversation/);
    const view = await loadTest(slugOf(t));
    expect(view.status === "ready" && view.linked.map((x) => [x.path, x.state])).toEqual([[c, "no-content"]]);
  });
  it("needs evidence notes of at least 20 non-space characters", async () => {
    const t = await createTest(PILOT, TODAY);
    await saveEvidenceNotes(t, "  yes   it   worked  ");
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow("Describe the evidence and where it came from.");
    expect((await testData(t)).data.status).toBe("running");
    await saveEvidenceNotes(t, "Two owners signed by email");
    await completeTest(t, complete(), TODAY);
    expect((await testData(t)).data.status).toBe("complete");
  });
  it("shows a one-sided link from either side as needing repair, never as evidence", async () => {
    const t = await createTest(PILOT, TODAY);
    const onlyTest = await createConversation({ ...DANA, person: "Lee Park", org: null });
    const onlyConversation = await createConversation({ ...DANA, person: "Ana Ruiz", org: null });
    // Partial writes: each pair has only one side saved.
    await updateEntry("test", t, (data, body) => ({ data: { ...data!, relatedConversations: [onlyTest] }, body }));
    await updateEntry("conversation", onlyConversation, (data, body) => ({ data: { ...data!, relatedTests: [t] }, body }));
    const view = await loadTest(slugOf(t));
    if (view.status !== "ready") throw new Error(view.status);
    expect(Object.fromEntries(view.linked.map((x) => [x.path, x.state]))).toEqual({ [onlyTest]: "needs-repair", [onlyConversation]: "needs-repair" });
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(/Link a customer or prospect conversation/);
    // Linking again repairs it; then it counts.
    await linkEvidence(t, onlyConversation);
    const repaired = await loadTest(slugOf(t));
    expect(repaired.status === "ready" && repaired.linked.find((x) => x.path === onlyConversation)?.state).toBe("evidence");
  });
});

describe("an imported test needs the founder's confirmation", () => {
  const seed = (rel: string) => updateEntry("test", rel, (data, body) => ({ data: { ...data!, seeded: true, source: "folder import 2026-10-13 #abc" }, body }));
  it("refuses to start or complete an imported test until its criteria are confirmed", async () => {
    const planned = await createTest({ ...PILOT, startNow: false }, TODAY);
    await seed(planned);
    await expect(startTest(planned, TODAY)).rejects.toThrow("Confirm this test's criteria first.");
    const running = await createTest({ ...PILOT, title: "Another" }, TODAY);
    await withNotes(running);
    await seed(running);
    await expect(completeTest(running, complete(), TODAY)).rejects.toThrow("Confirm this test's criteria first.");
    expect((await testData(running)).data.status).toBe("running");
    await confirmImportedRecord(planned);
    await startTest(planned, TODAY);
    expect((await testData(planned)).data.status).toBe("running");
  });
});

describe("a repeat completion", () => {
  it("says the test was already complete and keeps the result and decision it closed with", async () => {
    const t = await createTest(PILOT, TODAY);
    await withNotes(t);
    const first = await completeTest(t, complete(), TODAY);
    expect(first).toEqual({ commitmentId: first.commitmentId });
    const again = await completeTest(t, complete({ result: "contradicted", decision: "stop", why: "Changed my mind", nextCommitment: "" }), TODAY);
    expect(again).toEqual({ commitmentId: first.commitmentId, alreadyComplete: true });
    expect((await testData(t)).data).toMatchObject({ result: "supported", decision: "continue" });
  });
});

describe("a closed test is frozen", () => {
  const CLOSED = /This test is closed\. Add new evidence to the conversation, or start a follow-up test\./;
  const closedTests = async () => {
    const done = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(done, c);
    await completeTest(done, complete(), TODAY);
    const stopped = await createTest({ ...PILOT, title: "Find agencies in a directory" }, TODAY);
    await abandonTest(stopped, "Pricing changed", TODAY);
    return { done, stopped, c };
  };
  it("refuses new links on a complete or abandoned test, changing neither side", async () => {
    const { done, stopped } = await closedTests();
    const other = await createConversation({ ...DANA, person: "Sam Reyes" });
    await expect(linkEvidence(done, other)).rejects.toThrow(CLOSED);
    await expect(linkEvidence(stopped, other)).rejects.toThrow(CLOSED);
    const conv = await readEntry("conversation", other);
    expect(conv?.ok && conv.data.relatedTests).toEqual([]);
    expect((await testData(stopped)).data.relatedConversations).toEqual([]);
  });
  it("refuses to unlink from a closed test, keeping both sides", async () => {
    const { done, c } = await closedTests();
    await expect(unlinkEvidence(done, c)).rejects.toThrow(CLOSED);
    expect((await testData(done)).data.relatedConversations).toEqual([c]);
    const conv = await readEntry("conversation", c);
    expect(conv?.ok && conv.data.relatedTests).toEqual([done]);
  });
  it("refuses to change the evidence notes of a closed test", async () => {
    const { done, stopped } = await closedTests();
    await expect(saveEvidenceNotes(done, "Rewritten later")).rejects.toThrow(CLOSED);
    await expect(saveEvidenceNotes(stopped, "Rewritten later")).rejects.toThrow(CLOSED);
    expect((await testData(done)).body).not.toContain("Rewritten later");
  });
});

describe("link and unlink never leave the two sides disagreeing", () => {
  it("a link and an unlink of the same pair at the same moment end with both sides agreeing", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    const agree = async () => {
      const onTest = (await testData(t)).data.relatedConversations.includes(c);
      const conv = await readEntry("conversation", c);
      expect(conv?.ok && conv.data.relatedTests.includes(t)).toBe(onTest);
    };
    // An unlink that starts between the link's two writes, while the link pauses there, must wait for the link.
    // Both operations are settled before the test goes on, so neither can write after this test's folder is gone.
    let startUnlink!: (p: Promise<void>) => void;
    const unlinking = new Promise<Promise<void>>((r) => (startUnlink = r));
    const unlinkMidway = () => {
      startUnlink(unlinkEvidence(t, c));
      return new Promise<void>((r) => setTimeout(r, 50));
    };
    const settled = await Promise.allSettled([linkEvidence(t, c, { beforeSecondWrite: unlinkMidway }), unlinking.then((u) => u)]);
    expect(settled.map((x) => x.status)).toEqual(["fulfilled", "fulfilled"]);
    await agree();
    for (let i = 0; i < 5; i++) {
      const both = await Promise.allSettled([linkEvidence(t, c), unlinkEvidence(t, c)]);
      expect(both.map((x) => x.status)).toEqual(["fulfilled", "fulfilled"]);
      await agree();
    }
  });
});

describe("completion and unlinking of one test never interleave", () => {
  const CLEAR = /Link a customer or prospect conversation/;
  const sides = async (t: string, c: string) => {
    const conv = await readEntry("conversation", c);
    return { onTest: (await testData(t)).data.relatedConversations.includes(c), onConversation: !!(conv?.ok && conv.data.relatedTests.includes(t)) };
  };
  it("a completion that arrives while an unlink is between its writes leaves the pair consistent", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(t, c);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let reachedMidway!: () => void;
    const midway = new Promise<void>((r) => (reachedMidway = r));
    const unlinking = unlinkEvidence(t, c, {
      beforeSecondWrite: () => {
        reachedMidway();
        return gate;
      },
    });
    await midway;
    const completing = completeTest(t, complete(), TODAY);
    await new Promise((r) => setTimeout(r, 30));
    release();
    const [u, done] = await Promise.allSettled([unlinking, completing]);
    const s = await sides(t, c);
    expect(s.onConversation).toBe(s.onTest);
    if (done.status === "fulfilled") {
      // Completion ran first: the unlink is refused and both sides stay linked.
      expect(u.status).toBe("rejected");
      expect(s).toEqual({ onTest: true, onConversation: true });
    } else {
      // Completion waited for the unlink: its only evidence is gone, so it's refused.
      expect(String(done.reason)).toMatch(CLEAR);
      expect(u.status).toBe("fulfilled");
      expect(s).toEqual({ onTest: false, onConversation: false });
      expect((await testData(t)).data.status).toBe("running");
    }
  });
  it("puts the conversation side back when the unlink's second write fails, keeping the original error", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(t, c);
    await expect(unlinkEvidence(t, c, { beforeSecondWrite: () => { throw new Error("disk full"); } })).rejects.toThrow(/disk full/);
    expect(await sides(t, c)).toEqual({ onTest: true, onConversation: true });
  });
  it("doesn't count a conversation that doesn't link back to the test as evidence", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await updateEntry("test", t, (data, body) => ({ data: { ...data!, relatedConversations: [c] }, body }));
    await expect(completeTest(t, complete(), TODAY)).rejects.toThrow(CLEAR);
  });
  it("two completions at the same moment both resolve, one saying it was already complete, with one commitment", async () => {
    const t = await createTest(PILOT, TODAY);
    await withNotes(t);
    const settled = await Promise.allSettled([completeTest(t, complete(), TODAY), completeTest(t, complete(), TODAY)]);
    const results = settled.map((x) => {
      if (x.status === "rejected") throw x.reason;
      return x.value;
    });
    expect(results.filter((r) => r.alreadyComplete)).toHaveLength(1);
    expect(results[0].commitmentId).toBe(results[1].commitmentId);
    const week = await readEntry("checkin", "checkins/2026-W42.md");
    expect(week?.ok && week.data.commitments.filter((x) => x.link === t)).toHaveLength(1);
  });
  it("still refuses to complete an abandoned test", async () => {
    const t = await createTest(PILOT, TODAY);
    await abandonTest(t, "Pricing changed", TODAY);
    // allSettled, not Promise.all: the second completion must finish before the test ends, not run on after it.
    const both = await Promise.allSettled([completeTest(t, complete(), TODAY), completeTest(t, complete(), TODAY)]);
    expect(both.map((x) => (x.status === "rejected" ? String(x.reason) : "fulfilled"))).toEqual([
      expect.stringMatching(/already closed/),
      expect.stringMatching(/already closed/),
    ]);
  });
});

describe("cleaning up a broken link on a closed test", () => {
  it("removes the link from a readable conversation when the test exists but can't be read, leaving the test file alone", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(t, c);
    const file = path.join(env.dir, t);
    const broken = (await readFile(file, "utf8")).replace("status: running", "status: bogus");
    await writeFile(file, broken);
    await unlinkEvidence(t, c);
    const conv = await readEntry("conversation", c);
    expect(conv?.ok && conv.data.relatedTests).toEqual([]);
    expect(await readFile(file, "utf8")).toBe(broken);
  });
  it("removes a link to a conversation that's gone", async () => {
    const t = await createTest(PILOT, TODAY);
    await withNotes(t);
    await updateEntry("test", t, (data, body) => ({ data: { ...data!, relatedConversations: [GONE] }, body }));
    await completeTest(t, complete(), TODAY);
    await unlinkEvidence(t, GONE);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
  });
  it("removes a link to a conversation that can't be read", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(t, c);
    await completeTest(t, complete(), TODAY);
    await writeFile(path.join(env.dir, c), "---\ntype: nope\n---\n");
    await unlinkEvidence(t, c);
    expect((await testData(t)).data.relatedConversations).toEqual([]);
  });
  it("still refuses when the conversation reads fine", async () => {
    const t = await createTest(PILOT, TODAY);
    const c = await createConversation(DANA);
    await linkEvidence(t, c);
    await completeTest(t, complete(), TODAY);
    await expect(unlinkEvidence(t, c)).rejects.toThrow(/This test is closed/);
    expect((await testData(t)).data.relatedConversations).toEqual([c]);
  });
});
