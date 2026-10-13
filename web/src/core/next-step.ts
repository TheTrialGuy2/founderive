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
};

export type NextStepInput = {
  today: string;
  outcome: string | null | undefined;
  blocker: string | null | undefined;
  risks: { id: string; label: string; reason: string; href: string }[];
  currentTests: { path: string; title: string; href: string; due?: string | null }[];
  commitments: { id: string; text: string; due?: string | null; status: "open" | "done" | "dropped" }[];
  followUps: { id: string; text: string; href: string; due?: string | null }[];
  guideStep: { id: string; title: string; why: string } | null;
  programWork: { id: string; title: string; due?: string | null }[];
  flagged: { path: string; error: string }[];
  choices: { actionId: string; choice: "dismissed" | "deferred" | "replaced"; date: string; until?: string | null }[];
};

const LAST = "9999-12-31";
const byDue = (a: { due?: string | null }, b: { due?: string | null }) => (a.due ?? LAST).localeCompare(b.due ?? LAST);

/** Every eligible action in amendment §7 order: risk, blocker, test, overdue commitment, follow-up, guide, program, upkeep. */
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
    out.push({ id: `followup:${f.id}`, tier: 5, kind: "followup", label: f.text, reason: "Someone is waiting on you.", href: f.href, due: f.due });
  }
  if (input.guideStep) out.push({ id: `guide:${input.guideStep.id}`, tier: 6, kind: "guide", label: input.guideStep.title, reason: input.guideStep.why, ref: input.guideStep.id });
  for (const p of [...input.programWork].sort(byDue)) {
    out.push({ id: `program:${p.id}`, tier: 7, kind: "program", label: p.title, reason: p.due ? `Program work due ${p.due}.` : "Program work for this week.", ref: p.id, due: p.due });
  }
  for (const f of input.flagged) {
    out.push({ id: `fix:${f.path}`, tier: 8, kind: "fix", label: `Fix ${f.path}`, reason: "Founderive can't read this file, so it's left out everywhere.", ref: f.path });
  }
  return out.sort((a, b) => a.tier - b.tier);
}

/** Dismissed and replaced actions stay hidden for the week; deferred ones until their date. */
export function isSuppressed(id: string, choices: NextStepInput["choices"], today: string): boolean {
  return choices.some((c) => c.actionId === id && (c.choice !== "deferred" || !c.until || c.until > today));
}

export function nextStep(input: NextStepInput): Candidate | null {
  return rankCandidates(input).find((c) => !isSuppressed(c.id, input.choices, input.today)) ?? null;
}
