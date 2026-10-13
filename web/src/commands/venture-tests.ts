import { brokenLinks, linksOf, type BrokenLink } from "../core/links";
import { getSection, setSection } from "../core/markdown";
import { pathForSlug, slugOf } from "../core/slug";
import { checkCompletion, groupTests, type CompletionForm } from "../core/venture-tests";
import { isoWeekId } from "../core/week";
import { DECISION_LABELS } from "../lib/loop-labels";
import { existingPaths, listEntries, readEntry } from "../store/read";
import { AREAS, EVIDENCE_STRENGTHS, KINDS, type Area, type ConversationType, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";
import { checkinPath, loadCheckin, newId, type Checkin } from "./checkin";
import { createDated } from "./create";
import { isRealDate, oneOf, orNull, required, text, type Parsed } from "./form";

export type VentureTest = KindData<"test">;
export type TestRow = { path: string; slug: string; data: VentureTest };
export type ConversationOption = { path: string; slug: string; label: string; type: ConversationType; date: string | null };
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
  await updateEntry("test", rel, (data, body) => {
    if (!data) throw missing(rel);
    if (data.status !== "planned") throw new Error("Only a planned test can be started.");
    return { data: { ...data, status: "running", startedOn: today }, body };
  });
}

async function requireReadable(kind: "test" | "conversation", rel: string): Promise<void> {
  const e = await readEntry(kind, rel);
  if (!e) throw missing(rel);
  if (!e.ok) throw new Error(`Fix founder-data/${e.path} first: ${e.error}`);
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

/** Adds or removes one link on a test. Returns whether the file's list actually changed. */
async function setTestLink(testRel: string, conversationRel: string, on: boolean): Promise<boolean> {
  const result = { changed: false };
  await updateEntry("test", testRel, (data, body) => {
    if (!data) throw missing(testRel);
    const next = toggle(data.relatedConversations, conversationRel, on);
    result.changed = next.length !== data.relatedConversations.length;
    return { data: { ...data, relatedConversations: next }, body };
  });
  return result.changed;
}

/** Test seams for the failure paths; the app never passes them. */
export type LinkHooks = { beforeSecondWrite?: () => void; beforeRollback?: () => void };

/**
 * Links a conversation to a test as evidence, on both records. Safe to repeat: a repeat call adds only the missing
 * side, so it repairs a one-sided link. If the second write fails, only a link this call newly added is undone; a link
 * that was already there stays. If the undo itself fails, the original error is reported and a repeat call repairs it.
 */
export async function linkEvidence(testRel: string, conversationRel: string, hooks: LinkHooks = {}): Promise<void> {
  if (!KINDS.test.pattern.test(testRel) || !KINDS.conversation.pattern.test(conversationRel)) throw new Error("Pick a test and a conversation to link.");
  await requireReadable("test", testRel);
  await requireReadable("conversation", conversationRel);
  const addedToConversation = await setConversationLink(conversationRel, testRel, true);
  try {
    hooks.beforeSecondWrite?.();
    await setTestLink(testRel, conversationRel, true);
  } catch (error) {
    if (addedToConversation) {
      try {
        hooks.beforeRollback?.();
        await setConversationLink(conversationRel, testRel, false);
      } catch {
        // Keep the original error. The link is one-sided now; linking again or unlinking repairs it.
      }
    }
    throw error;
  }
}

/** Removes the link from both records. A side whose file is gone or misnamed (a broken link) is skipped. */
export async function unlinkEvidence(testRel: string, conversationRel: string): Promise<void> {
  const present = async (kind: "test" | "conversation", rel: string) => KINDS[kind].pattern.test(rel) && (await readEntry(kind, rel)) !== null;
  if (await present("conversation", conversationRel)) await setConversationLink(conversationRel, testRel, false);
  if (await present("test", testRel)) await setTestLink(testRel, conversationRel, false);
}

/** The founder's own rating of the evidence so far (paid > behavior > opinion). Closed tests keep the rating they closed with. */
export async function setEvidenceStrength(rel: string, strength: string): Promise<void> {
  if (!oneOf(EVIDENCE_STRENGTHS, strength)) throw new Error("Pick how strong the evidence is.");
  const s = strength;
  await updateEntry("test", rel, (data, body) => {
    if (!data) throw missing(rel);
    if (isClosed(data)) throw new Error("This test is closed. Its evidence strength was set when it closed.");
    return { data: { ...data, evidenceStrength: s }, body };
  });
}

/** Writes the founder's summary of the evidence under "## Evidence". */
export async function saveEvidenceNotes(rel: string, notes: string): Promise<void> {
  await updateEntry("test", rel, (data, body) => {
    if (!data) throw missing(rel);
    return { data, body: setSection(body, "Evidence", notes) };
  });
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
  const weeks = [...new Set([test.closedOn ? isoWeekId(test.closedOn) : weekId, weekId])];
  try {
    for (const w of weeks) {
      const found = (await loadCheckin(w)).data.commitments.find(isIt);
      if (found) return { commitmentId: found.id };
    }
    const id = newId("c");
    const { data } = await updateEntry("checkin", checkinPath(weekId), (current, body) => {
      const c: Checkin = current ?? { week: weekId, commitments: [], nextStepLog: [] };
      if (c.commitments.some(isIt)) return { data: c, body };
      return { data: { ...c, commitments: [...c.commitments, { id, text, due: test.nextCommitmentDue ?? null, status: "open", reason: null, link: rel }] }, body };
    });
    const saved = data.commitments.find(isIt);
    if (!saved) throw new Error("the check-in didn't keep it");
    return { commitmentId: saved.id };
  } catch (error) {
    const why = error instanceof Error ? error.message : "unknown error";
    throw new Error(`The test is saved as complete, but its next commitment wasn't added to this week (${why}). Fix that, then complete the test again to add it.`);
  }
}

/**
 * Closes a test with the founder's result and decision (kept separate), writes the learning and the reason into the
 * body, and adds the next commitment (if any) to this week's check-in, linked to the test. Safe to repeat: on a test
 * that's already complete it only adds a next commitment that a failed earlier attempt left out.
 */
export async function completeTest(rel: string, form: CompletionForm, today: string): Promise<{ commitmentId: string | null }> {
  const current = await readEntry("test", rel);
  if (current?.ok && current.data.status === "complete") return ensureNextCommitment(rel, current.data, today);
  const checked = checkCompletion(form);
  if (!checked.ok) throw new Error(Object.values(checked.errors)[0]);
  const c = checked.value;
  const { data: closed } = await updateEntry("test", rel, (data, body) => {
    if (!data) throw missing(rel);
    if (isClosed(data)) throw new Error("This test is already closed.");
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
  await updateEntry("test", rel, (data, body) => {
    if (!data) throw missing(rel);
    if (isClosed(data)) throw new Error("This test is already closed.");
    return { data: { ...data, status: "abandoned", abandonReason: why, closedOn: today }, body };
  });
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
      linked: ConversationOption[];
      conversations: ConversationOption[];
      broken: BrokenLink[];
    };

export async function loadTest(slug: string): Promise<TestView> {
  const rel = pathForSlug(TESTS_DIR, slug);
  const entry = rel ? await readEntry("test", rel) : null;
  if (!entry) return { status: "missing" };
  if (!entry.ok) return { status: "flagged", path: entry.path, error: entry.error };
  const present = await existingPaths();
  const conversations = (await listEntries("conversation"))
    .flatMap((c) =>
      c.ok ? [{ path: c.path, slug: slugOf(c.path), label: c.data.org ? `${c.data.person} · ${c.data.org}` : c.data.person, type: c.data.type, date: c.data.date ?? null }] : [],
    )
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
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
    linked: conversations.filter((c) => entry.data.relatedConversations.includes(c.path)),
    conversations,
    broken: brokenLinks(linksOf("test", entry.data), (r) => present.has(r)),
  };
}
