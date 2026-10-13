export type CandidateKind = "risk" | "outcome" | "blocker" | "test" | "commitment" | "followup" | "guide" | "program" | "fix";

export type Candidate = {
  id: string; // stable, used to log dismiss/defer/replace
  tier: number;
  kind: CandidateKind;
  label: string;
  reason: string;
  ref?: string; // commitment id, homework id, guide step id or file path
  href?: string;
  due?: string | null;
  suggestion?: string;
  detail?: string; // evidence so far, shown under the reason
};

export type NextStepInput = {
  today: string;
  outcome: string | null | undefined;
  blocker: string | null | undefined;
  risks: { id: string; label: string; reason: string; href: string }[];
  currentTests: { path: string; title: string; href: string; due?: string | null }[];
  commitments: { id: string; text: string; due?: string | null; status: "open" | "done" | "dropped"; link?: string | null }[];
  followUps: { id: string; text: string; href: string; due?: string | null }[];
  guideStep: { id: string; title: string; why: string; progress?: string | null } | null;
  programWork: { id: string; title: string; due?: string | null }[];
  flagged: { path: string; error: string }[];
  choices: { actionId: string; choice: "dismissed" | "deferred" | "replaced"; date: string; until?: string | null }[];
};

const LAST = "9999-12-31";
const isGuideLink = (link: string | null | undefined) => !!link?.startsWith("guide:");
const isTestLink = (link: string | null | undefined) => !!link?.startsWith("tests/");
const byDue = (a: { due?: string | null }, b: { due?: string | null }) => (a.due ?? LAST).localeCompare(b.due ?? LAST);

/**
 * Every eligible action, in order: 1 risk, 2 missing outcome or blocker, 3 running test, 4 overdue commitment,
 * 5 due follow-up, 6 open commitment (not overdue), 7 guide or test commitment, 8 guide step, 9 program work, 10 upkeep.
 * Within a tier: earliest due first, undated after dated, then file order (the sort is stable).
 */
export function rankCandidates(input: NextStepInput): Candidate[] {
  const out: Candidate[] = [];
  for (const r of input.risks) out.push({ id: `risk:${r.id}`, tier: 1, kind: "risk", label: r.label, reason: r.reason, href: r.href });
  if (!input.outcome) {
    out.push({ id: "outcome", tier: 2, kind: "outcome", label: "Set this week's outcome", reason: "Everything else this week is ranked against it.", suggestion: input.guideStep?.title });
  }
  if (input.blocker) out.push({ id: "blocker", tier: 2, kind: "blocker", label: `Work through your blocker: ${input.blocker}`, reason: "It's stopping this week's outcome." });
  for (const t of [...input.currentTests].sort(byDue)) {
    out.push({ id: `test:${t.path}`, tier: 3, kind: "test", label: `Continue: ${t.title}`, reason: "A test is running. Finishing it produces the learning.", href: t.href, due: t.due });
  }
  for (const c of input.commitments.filter((c) => c.status === "open" && c.due && c.due < input.today).sort(byDue)) {
    out.push({ id: `commitment:${c.id}`, tier: 4, kind: "commitment", label: c.text, reason: `Overdue since ${c.due}.`, ref: c.id, due: c.due });
  }
  for (const f of input.followUps.filter((f) => !f.due || f.due <= input.today).sort(byDue)) {
    out.push({ id: `followup:${f.id}`, tier: 5, kind: "followup", label: f.text, reason: "Someone is waiting on you.", ref: f.id, href: f.href, due: f.due });
  }
  // Do what you said you'd do before taking on a new guide step. Guide and test commitments rank at 7 with their own reason.
  const notOverdue = (c: { due?: string | null }) => !(c.due && c.due < input.today);
  for (const c of input.commitments.filter((c) => c.status === "open" && notOverdue(c) && !isGuideLink(c.link) && !isTestLink(c.link)).sort(byDue)) {
    out.push({ id: `commitment:${c.id}`, tier: 6, kind: "commitment", label: c.text, reason: "You committed to this for this week.", ref: c.id, due: c.due });
  }
  // An open guide commitment is this week's guide work, so no new guide step is proposed alongside it.
  const guideCommitments = input.commitments.filter((c) => c.status === "open" && isGuideLink(c.link));
  for (const c of guideCommitments.filter(notOverdue).sort(byDue)) {
    out.push({ id: `commitment:${c.id}`, tier: 7, kind: "commitment", label: c.text, reason: "You committed to this step this week.", ref: c.id, due: c.due });
  }
  // The next commitment chosen when completing a test is the loop's next step (amendment §1), so it ranks with guide commitments.
  for (const c of input.commitments.filter((c) => c.status === "open" && isTestLink(c.link) && notOverdue(c)).sort(byDue)) {
    out.push({ id: `commitment:${c.id}`, tier: 7, kind: "commitment", label: c.text, reason: "You chose this as the next step after a test.", ref: c.id, due: c.due });
  }
  if (input.guideStep && guideCommitments.length === 0)
    out.push({ id: `guide:${input.guideStep.id}`, tier: 8, kind: "guide", label: input.guideStep.title, reason: input.guideStep.why, ref: input.guideStep.id, detail: input.guideStep.progress ?? undefined });
  for (const p of [...input.programWork].sort(byDue)) {
    out.push({ id: `program:${p.id}`, tier: 9, kind: "program", label: p.title, reason: p.due ? `Program work due ${p.due}.` : "Program work for this week.", ref: p.id, due: p.due });
  }
  for (const f of input.flagged) {
    out.push({ id: `fix:${f.path}`, tier: 10, kind: "fix", label: `Fix ${f.path}`, reason: "Founderive can't read this file, so it's left out everywhere.", ref: f.path });
  }
  return out.sort((a, b) => a.tier - b.tier);
}

type CheckinChoices = { week: string; nextStepLog: (NextStepInput["choices"][number] & { until?: string | null })[] };

/**
 * The "not now" choices that still apply today: dismissed and replaced ones from this week's check-in only,
 * and deferred ones from any week's check-in until their date.
 */
export function activeChoices(checkins: CheckinChoices[], weekId: string, today: string): NextStepInput["choices"] {
  return checkins.flatMap((c) =>
    c.nextStepLog.filter((choice) => (choice.choice === "deferred" && choice.until ? choice.until > today : c.week === weekId)),
  );
}

/**
 * Whether an action is hidden by a choice. The caller scopes `choices` (see activeChoices): any dismissed or
 * replaced choice passed in hides the action; a deferred one hides it until its date.
 */
export function isSuppressed(id: string, choices: NextStepInput["choices"], today: string): boolean {
  return choices.some((c) => c.actionId === id && (c.choice !== "deferred" || !c.until || c.until > today));
}

export function nextStep(input: NextStepInput): Candidate | null {
  return rankCandidates(input).find((c) => !isSuppressed(c.id, input.choices, input.today)) ?? null;
}
