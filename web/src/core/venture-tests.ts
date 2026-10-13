import { EVIDENCE_STRENGTHS, isoDate, TEST_DECISIONS, TEST_RESULTS, type EvidenceStrength, type TestDecision, type TestResult, type TestStatus } from "../store/schemas";
import { slugOf } from "./slug";

export type CompletionForm = { result: string; evidenceStrength: string; learning: string; decision: string; why: string; nextCommitment: string; nextCommitmentDue: string };
export type Completion = {
  result: TestResult;
  evidenceStrength: EvidenceStrength;
  learning: string;
  decision: TestDecision;
  why: string;
  nextCommitment: string | null; // optional only when the decision is stop
  nextCommitmentDue: string | null;
};

const isOne = <T extends string>(list: readonly T[], v: string): v is T => (list as readonly string[]).includes(v);

/**
 * The rules for closing a test (amendment §5.4). The founder picks the result, so finishing never validates on its
 * own. Inconclusive is always allowed; a supported or contradicted result needs evidence above "none". The founder
 * writes the learning, picks the decision, says why and names the next commitment (optional only for "stop").
 */
export function checkCompletion(form: CompletionForm): { ok: true; value: Completion } | { ok: false; errors: Record<string, string> } {
  const f = {
    ...form,
    learning: form.learning.trim(),
    why: form.why.trim(),
    nextCommitment: form.nextCommitment.trim(),
    nextCommitmentDue: form.nextCommitmentDue.trim(),
  };
  const errors: Record<string, string> = {};
  if (!isOne(TEST_RESULTS, f.result)) errors.result = "Pick a result: supported, contradicted or inconclusive.";
  if (!isOne(EVIDENCE_STRENGTHS, f.evidenceStrength)) errors.evidenceStrength = "Pick how strong the evidence is.";
  else if (f.evidenceStrength === "none" && (f.result === "supported" || f.result === "contradicted"))
    errors.evidenceStrength = "A clear result needs evidence. Say how strong it is, or mark the result inconclusive.";
  if (!f.learning) errors.learning = "Write what you learned, even if it's “not enough signal yet”.";
  if (!isOne(TEST_DECISIONS, f.decision)) errors.decision = "Choose continue, revise, pause or stop.";
  if (!f.why) errors.why = "Say why you chose this.";
  if (!f.nextCommitment && f.decision !== "stop") errors.nextCommitment = "Write the next thing you'll do.";
  if (f.nextCommitmentDue && !isoDate.safeParse(f.nextCommitmentDue).success) errors.nextCommitmentDue = "Use a real date.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      result: f.result as TestResult,
      evidenceStrength: f.evidenceStrength as EvidenceStrength,
      learning: f.learning,
      decision: f.decision as TestDecision,
      why: f.why,
      nextCommitment: f.nextCommitment || null,
      nextCommitmentDue: f.nextCommitment ? f.nextCommitmentDue || null : null,
    },
  };
}

type TestRow = { path: string; data: { title: string; status: TestStatus; due?: string | null; closedOn?: string | null; relatedConversations: string[]; evidenceStrength: EvidenceStrength } };
const LAST = "9999-12-31";
const byDue = (a: TestRow, b: TestRow) => (a.data.due ?? LAST).localeCompare(b.data.due ?? LAST) || a.path.localeCompare(b.path);
const newestClosed = (a: TestRow, b: TestRow) => (b.data.closedOn ?? "").localeCompare(a.data.closedOn ?? "") || a.path.localeCompare(b.path);

/** Running and planned soonest due first; complete and stopped-early newest first. */
export function groupTests<T extends TestRow>(rows: T[]): { running: T[]; planned: T[]; closed: T[] } {
  return {
    running: rows.filter((r) => r.data.status === "running").sort(byDue),
    planned: rows.filter((r) => r.data.status === "planned").sort(byDue),
    closed: rows.filter((r) => r.data.status === "complete" || r.data.status === "abandoned").sort(newestClosed),
  };
}

export type CurrentTest = { path: string; slug: string; title: string; due: string | null; linkedCount: number; evidenceCount: number; evidenceStrength: EvidenceStrength };

/**
 * The test Today shows (amendment §5.2 item 3): the running test due soonest. `evidenceCount` counts only linked
 * conversations that are customer evidence; advice links never raise it.
 */
export function currentTest(rows: TestRow[], isCustomerEvidence: (path: string) => boolean = () => true): CurrentTest | null {
  const t = groupTests(rows).running[0];
  if (!t) return null;
  const evidenceCount = t.data.relatedConversations.filter(isCustomerEvidence).length;
  return { path: t.path, slug: slugOf(t.path), title: t.data.title, due: t.data.due ?? null, linkedCount: t.data.relatedConversations.length, evidenceCount, evidenceStrength: t.data.evidenceStrength };
}

/** The founder's reason from the "Decision and why" section, without the bold decision label that leads it. */
export function whyFrom(section: string): string {
  return section.replace(/^\*\*[^*]+\*\*\s*/, "").trim();
}
