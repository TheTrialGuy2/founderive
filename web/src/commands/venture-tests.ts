import { isEvidenceEligible, testLinks, type LinkState } from "../core/conversations";
import { brokenLinks, linksOf, type BrokenLink } from "../core/links";
import { getSection, setSection } from "../core/markdown";
import { pathForSlug, slugOf } from "../core/slug";
import { checkCompletion, groupTests, type CompletionForm } from "../core/venture-tests";
import { isoWeekId } from "../core/week";
import { DECISION_LABELS } from "../lib/loop-labels";
import { existingPaths, listEntries, readEntry } from "../store/read";
import { AREAS, EVIDENCE_STRENGTHS, KINDS, type Area, type ConversationType, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";
import { appendCommitmentOnce, loadCheckin, newId, type Checkin } from "./checkin";
import { createDated } from "./create";
import { isRealDate, oneOf, orNull, required, text, type Parsed } from "./form";

export type VentureTest = KindData<"test">;
export type TestRow = { path: string; slug: string; data: VentureTest };
export type ConversationOption = { path: string; slug: string; label: string; type: ConversationType; date: string | null; seeded: boolean };
/** A conversation linked to the test from either side, with how it reads there (core/conversations testLinks). */
export type LinkedConversation = ConversationOption & { state: LinkState };
export const TESTS_DIR = "tests";
export const TEST_BODY = "## Evidence\n\n## What we learned\n\n## Decision and why\n";

export type TestInput = {
  title: string;
  area: Area;
  belief: string;
  risk: string | null;
  test: string;
  successCriteria: string;
  failureCriteria: string;
  due: string | null;
  startNow: boolean;
};

export function parseTestForm(fd: FormData): Parsed<TestInput> {
  const values: Record<string, string> = {};
  for (const k of ["title", "area", "belief", "risk", "test", "successCriteria", "failureCriteria", "due", "startNow"]) values[k] = text(fd, k);
  const errors: Record<string, string> = {};
  if (!values.title) errors.title = "Name the test in a few words.";
  if (!oneOf(AREAS, values.area)) errors.area = "Pick the part of the business this tests.";
  if (!values.belief) errors.belief = "Write the belief you're testing.";
  if (!values.test) errors.test = "Say what you'll do to test it.";
  if (!values.successCriteria) errors.successCriteria = "Decide now what counts as success, with a number if you can.";
  if (!values.failureCriteria) errors.failureCriteria = "Decide now what would prove it wrong.";
  if (values.due && !isRealDate(values.due)) errors.due = "Use a real date.";
  if (Object.keys(errors).length > 0) return { ok: false, errors, values };
  return {
    ok: true,
    values,
    input: {
      title: values.title,
      area: values.area as Area,
      belief: values.belief,
      risk: orNull(values.risk),
      test: values.test,
      successCriteria: values.successCriteria,
      failureCriteria: values.failureCriteria,
      due: orNull(values.due),
      startNow: values.startNow === "on",
    },
  };
}

const missing = (rel: string) => new Error(`founder-data/${rel} isn't there anymore. Reload the page.`);
const isClosed = (t: VentureTest) => t.status === "complete" || t.status === "abandoned";
const CLOSED = "This test is closed. Add new evidence to the conversation, or start a follow-up test.";
const refuseClosed = (t: VentureTest) => {
  if (isClosed(t)) throw new Error(CLOSED);
};
/** An imported (agent-drafted) test runs only once the founder has confirmed its criteria (amendment §3.4). */
const refuseSeeded = (t: VentureTest) => {
  if (t.seeded) throw new Error("Confirm this test's criteria first.");
};
const toggle = (list: string[], item: string, on: boolean) => (on ? (list.includes(item) ? list : [...list, item]) : list.filter((p) => p !== item));

/** Creates a venture test. Success and failure criteria are required up front, before any result exists. */
export async function createTest(input: TestInput, today: string): Promise<string> {
  required(input.successCriteria, "Decide now what counts as success.");
  required(input.failureCriteria, "Decide now what would prove it wrong.");
  const data: VentureTest = {
    title: input.title,
    area: input.area,
    status: input.startNow ? "running" : "planned",
    belief: input.belief,
    risk: input.risk,
    test: input.test,
    successCriteria: input.successCriteria,
    failureCriteria: input.failureCriteria,
    due: input.due,
    startedOn: input.startNow ? today : null,
    relatedConversations: [],
    relatedFiles: [],
    evidenceStrength: "none",
    result: null,
    decision: null,
  };
  return createDated("test", TESTS_DIR, today, input.title, data, TEST_BODY);
}

export async function startTest(rel: string, today: string): Promise<void> {
  await serializedTest(rel, () =>
    updateEntry("test", rel, (data, body) => {
      if (!data) throw missing(rel);
      refuseSeeded(data);
      if (data.status !== "planned") throw new Error("Only a planned test can be started.");
      return { data: { ...data, status: "running", startedOn: today }, body };
    }),
  );
}

async function requireReadable<K extends "test" | "conversation">(kind: K, rel: string): Promise<KindData<K>> {
  const e = await readEntry(kind, rel);
  if (!e) throw missing(rel);
  if (!e.ok) throw new Error(`Fix founder-data/${e.path} first: ${e.error}`);
  return e.data;
}

const testQueues = new Map<string, Promise<unknown>>();

/**
 * Runs `work` after every earlier mutation of the same test has finished (an in-process mutex per test, the same
 * pattern as the store's per-file one). Every command that changes a test or its evidence links goes through it, so a
 * link or unlink (two writes) and a completion that reads those links can't interleave. `work` must not call another
 * command that takes the same test's turn, or it would wait on itself.
 */
async function serializedTest<T>(testRel: string, work: () => Promise<T>): Promise<T> {
  const previous = testQueues.get(testRel) ?? Promise.resolve();
  const run = previous.then(work, work);
  const tail = run.catch(() => undefined);
  testQueues.set(testRel, tail);
  try {
    return await run;
  } finally {
    if (testQueues.get(testRel) === tail) testQueues.delete(testRel);
  }
}

/** Adds or removes one link on a conversation. Returns whether the file's list actually changed. */
async function setConversationLink(conversationRel: string, testRel: string, on: boolean): Promise<boolean> {
  const result = { changed: false };
  await updateEntry("conversation", conversationRel, (data, body) => {
    if (!data) throw missing(conversationRel);
    const next = toggle(data.relatedTests, testRel, on);
    result.changed = next.length !== data.relatedTests.length;
    return { data: { ...data, relatedTests: next }, body };
  });
  return result.changed;
}

/** Adds or removes one link on a test. Returns whether the file's list actually changed. Refuses a closed test unless `allowClosed`. */
async function setTestLink(testRel: string, conversationRel: string, on: boolean, allowClosed = false): Promise<boolean> {
  const result = { changed: false };
  await updateEntry("test", testRel, (data, body) => {
    if (!data) throw missing(testRel);
    if (!allowClosed) refuseClosed(data);
    const next = toggle(data.relatedConversations, conversationRel, on);
    result.changed = next.length !== data.relatedConversations.length;
    return { data: { ...data, relatedConversations: next }, body };
  });
  return result.changed;
}

/** Test seams for the failure paths; the app never passes them. */
export type LinkHooks = { beforeSecondWrite?: () => void | Promise<void>; beforeRollback?: () => void | Promise<void> };

/**
 * Links a conversation to a test as evidence, on both records. Safe to repeat: a repeat call adds only the missing
 * side, so it repairs a one-sided link. If the second write fails, only a link this call newly added is undone; a link
 * that was already there stays. If the undo itself fails, the original error is reported and a repeat call repairs it.
 * A closed test is frozen: new evidence goes on the conversation or a follow-up test.
 */
export async function linkEvidence(testRel: string, conversationRel: string, hooks: LinkHooks = {}): Promise<void> {
  if (!KINDS.test.pattern.test(testRel) || !KINDS.conversation.pattern.test(conversationRel)) throw new Error("Pick a test and a conversation to link.");
  return serializedTest(testRel, () => linkBoth(testRel, conversationRel, hooks));
}

async function linkBoth(testRel: string, conversationRel: string, hooks: LinkHooks): Promise<void> {
  refuseClosed(await requireReadable("test", testRel));
  await requireReadable("conversation", conversationRel);
  const addedToConversation = await setConversationLink(conversationRel, testRel, true);
  try {
    await hooks.beforeSecondWrite?.();
    await setTestLink(testRel, conversationRel, true);
  } catch (error) {
    if (addedToConversation) {
      try {
        await hooks.beforeRollback?.();
        await setConversationLink(conversationRel, testRel, false);
      } catch {
        // Keep the original error. The link is one-sided now; linking again or unlinking repairs it.
      }
    }
    throw error;
  }
}

/**
 * Removes the link from both records. A side whose file is gone, misnamed or unreadable (a broken link) is skipped.
 * A closed test is frozen, so its links stay, except that a broken link (the conversation is gone or can't be read)
 * can still be cleaned off it. If the test's write fails, the conversation's link is put back and the original error
 * is reported.
 */
export async function unlinkEvidence(testRel: string, conversationRel: string, hooks: LinkHooks = {}): Promise<void> {
  return serializedTest(testRel, async () => {
    const test = KINDS.test.pattern.test(testRel) ? await readEntry("test", testRel) : null;
    const conversation = KINDS.conversation.pattern.test(conversationRel) ? await readEntry("conversation", conversationRel) : null;
    const brokenLink = !conversation?.ok;
    if (test?.ok && !brokenLink) refuseClosed(test.data);
    const removedFromConversation = brokenLink ? false : await setConversationLink(conversationRel, testRel, false);
    try {
      await hooks.beforeSecondWrite?.();
      if (test) await setTestLink(testRel, conversationRel, false, brokenLink);
    } catch (error) {
      if (removedFromConversation) {
        try {
          await setConversationLink(conversationRel, testRel, true);
        } catch {
          // Keep the original error. The link is one-sided now; linking again repairs it, and check-data reports it.
        }
      }
      throw error;
    }
  });
}

/** The founder's own rating of the evidence so far (paid > behavior > opinion). Closed tests keep the rating they closed with. */
export async function setEvidenceStrength(rel: string, strength: string): Promise<void> {
  if (!oneOf(EVIDENCE_STRENGTHS, strength)) throw new Error("Pick how strong the evidence is.");
  const s = strength;
  await serializedTest(rel, () =>
    updateEntry("test", rel, (data, body) => {
      if (!data) throw missing(rel);
      if (isClosed(data)) throw new Error("This test is closed. Its evidence strength was set when it closed.");
      return { data: { ...data, evidenceStrength: s }, body };
    }),
  );
}

/** Writes the founder's summary of the evidence, and where it came from, under "## Evidence". Not on a closed test. */
export async function saveEvidenceNotes(rel: string, notes: string): Promise<void> {
  await serializedTest(rel, () =>
    updateEntry("test", rel, (data, body) => {
      if (!data) throw missing(rel);
      refuseClosed(data);
      return { data, body: setSection(body, "Evidence", notes) };
    }),
  );
}

/**
 * Makes sure a completed test's next commitment is in a check-in, linked to the test, exactly once. It counts when it's
 * already in the week the test closed or in this week; otherwise it's added to this week. The final check runs inside
 * the check-in's own read-change-write, so two repeat calls at the same moment still add it once.
 * Returns its id, or null when the founder chose "stop" without one.
 */
async function ensureNextCommitment(rel: string, test: VentureTest, today: string): Promise<{ commitmentId: string | null }> {
  const text = test.nextCommitment?.trim();
  if (!text) return { commitmentId: null };
  const isIt = (c: Checkin["commitments"][number]) => c.link === rel && c.text === text;
  const weekId = isoWeekId(today);
  const closingWeek = test.closedOn ? isoWeekId(test.closedOn) : weekId;
  try {
    if (closingWeek !== weekId) {
      const found = (await loadCheckin(closingWeek)).data.commitments.find(isIt);
      if (found) return { commitmentId: found.id };
    }
    const saved = await appendCommitmentOnce(weekId, { id: newId("c"), text, due: test.nextCommitmentDue ?? null, link: rel }, isIt);
    return { commitmentId: saved.id };
  } catch (error) {
    const why = error instanceof Error ? error.message : "unknown error";
    throw new Error(`The test is saved as complete, but its next commitment wasn't added to this week (${why}). Fix that, then complete the test again to add it.`);
  }
}

/** The founder's description under "## Evidence" counts only when it says something: at least this many non-space characters. */
export const MIN_EVIDENCE_NOTES = 20;
const SHORT_NOTES = "Describe the evidence and where it came from.";

/**
 * Whether a test has evidence that can carry a clear result (spec §3.1): a conversation that passes the shared rules
 * (core/conversations: both records link each other, and it's a confirmed customer or prospect conversation that
 * records something), or the founder's own description of the evidence under "## Evidence", at least
 * MIN_EVIDENCE_NOTES non-space characters long. Returns the reason when there's none.
 */
async function realEvidence(rel: string, test: VentureTest, body: string): Promise<{ ok: true } | { ok: false; shortNotes: boolean }> {
  const notes = getSection(body, "Evidence").replace(/\s/g, "");
  if (notes.length >= MIN_EVIDENCE_NOTES) return { ok: true };
  for (const p of test.relatedConversations) {
    const e = KINDS.conversation.pattern.test(p) ? await readEntry("conversation", p) : null;
    if (e?.ok && e.data.relatedTests.includes(rel) && isEvidenceEligible(e.data, e.body)) return { ok: true };
  }
  return { ok: false, shortNotes: notes.length > 0 };
}

/**
 * Closes a test with the founder's result and decision (kept separate), writes the learning and the reason into the
 * body, and adds the next commitment (if any) to this week's check-in, linked to the test. A supported or contradicted
 * result needs real evidence; inconclusive is always allowed. Safe to repeat: on a test that's already complete it
 * changes nothing but a next commitment that a failed earlier attempt left out, and says `alreadyComplete`. That
 * includes a completion that waited its turn behind another one of the same test.
 */
export async function completeTest(rel: string, form: CompletionForm, today: string): Promise<{ commitmentId: string | null; alreadyComplete?: true }> {
  return serializedTest(rel, () => completeInTurn(rel, form, today));
}

async function completeInTurn(rel: string, form: CompletionForm, today: string): Promise<{ commitmentId: string | null; alreadyComplete?: true }> {
  const current = await readEntry("test", rel);
  if (current?.ok) refuseSeeded(current.data);
  if (current?.ok && current.data.status === "complete") return { ...(await ensureNextCommitment(rel, current.data, today)), alreadyComplete: true };
  const checked = checkCompletion(form);
  if (!checked.ok) throw new Error(Object.values(checked.errors)[0]);
  const c = checked.value;
  const { data: closed } = await updateEntry("test", rel, async (data, body) => {
    if (!data) throw missing(rel);
    refuseSeeded(data);
    if (isClosed(data)) throw new Error("This test is already closed.");
    if (c.result !== "inconclusive") {
      const evidence = await realEvidence(rel, data, body);
      if (!evidence.ok)
        throw new Error(evidence.shortNotes ? SHORT_NOTES : `Link a customer or prospect conversation, or describe the evidence and where it came from, before marking it ${c.result}.`);
    }
    const withLearning = setSection(body, "What we learned", c.learning);
    return {
      data: {
        ...data,
        status: "complete",
        result: c.result,
        decision: c.decision,
        evidenceStrength: c.evidenceStrength,
        nextCommitment: c.nextCommitment,
        nextCommitmentDue: c.nextCommitmentDue,
        startedOn: data.startedOn ?? today,
        closedOn: today,
      },
      body: setSection(withLearning, "Decision and why", `**${DECISION_LABELS[c.decision]}.** ${c.why}`),
    };
  });
  return ensureNextCommitment(rel, closed, today);
}

export async function abandonTest(rel: string, reason: string, today: string): Promise<void> {
  const why = required(reason, "Say why you're stopping this test. “The assumption no longer matters” is a fine reason.");
  await serializedTest(rel, () =>
    updateEntry("test", rel, (data, body) => {
      if (!data) throw missing(rel);
      if (isClosed(data)) throw new Error("This test is already closed.");
      return { data: { ...data, status: "abandoned", abandonReason: why, closedOn: today }, body };
    }),
  );
}

/** Every test: running, planned, then complete and stopped early. Unreadable files are listed, never dropped. */
export async function loadTests(): Promise<{ running: TestRow[]; planned: TestRow[]; closed: TestRow[]; flagged: { path: string; error: string }[] }> {
  const entries = await listEntries("test");
  const rows = entries.flatMap((e) => (e.ok ? [{ path: e.path, slug: slugOf(e.path), data: e.data }] : []));
  const flagged = entries.flatMap((e) => (e.ok ? [] : [{ path: e.path, error: e.error }]));
  return { ...groupTests(rows), flagged };
}

export type TestView =
  | { status: "missing" }
  | { status: "flagged"; path: string; error: string }
  | {
      status: "ready";
      path: string;
      slug: string;
      data: VentureTest;
      sections: { plan: string; evidence: string; learning: string; decisionWhy: string };
      linked: LinkedConversation[];
      conversations: ConversationOption[];
      broken: BrokenLink[];
    };

export async function loadTest(slug: string): Promise<TestView> {
  const rel = pathForSlug(TESTS_DIR, slug);
  const entry = rel ? await readEntry("test", rel) : null;
  if (!entry) return { status: "missing" };
  if (!entry.ok) return { status: "flagged", path: entry.path, error: entry.error };
  const present = await existingPaths();
  const records = (await listEntries("conversation"))
    .flatMap((c) => (c.ok ? [{ path: c.path, data: c.data, notes: c.body }] : []))
    .sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""));
  const option = (c: (typeof records)[number]): ConversationOption => ({
    path: c.path,
    slug: slugOf(c.path),
    label: c.data.org ? `${c.data.person} · ${c.data.org}` : c.data.person,
    type: c.data.type,
    date: c.data.date ?? null,
    seeded: !!c.data.seeded,
  });
  return {
    status: "ready",
    path: entry.path,
    slug,
    data: entry.data,
    sections: {
      plan: getSection(entry.body, "Plan"),
      evidence: getSection(entry.body, "Evidence"),
      learning: getSection(entry.body, "What we learned"),
      decisionWhy: getSection(entry.body, "Decision and why"),
    },
    // Linked from either side; a one-sided link comes back as "needs-repair" and never counts.
    linked: testLinks({ path: entry.path, data: entry.data }, records).map((l) => ({ ...option(l.conversation), state: l.state })),
    conversations: records.map(option),
    broken: brokenLinks(linksOf("test", entry.data), (r) => present.has(r)),
  };
}
