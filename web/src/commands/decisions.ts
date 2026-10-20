import { isCustomerEvidence } from "../core/conversations";
import { byNewestDecision } from "../core/decision-order";
import { brokenLinks, linksOf, type BrokenLink } from "../core/links";
import { existingPaths, listEntries } from "../store/read";
import { AREAS, kindOf, type Area, type KindData } from "../store/schemas";
import { createDated } from "./create";
import { all, isRealDate, lines, oneOf, orNull, required, text, type Parsed } from "./form";
import { updateEntry } from "../store/update";

export type Decision = KindData<"decision">;
export type DecisionRow = { path: string; data: Decision; broken: BrokenLink[]; notes: string };
export const DECISIONS_DIR = "decisions";

export type DecisionInput = {
  title: string;
  date: string;
  status: "open" | "decided";
  decideBy: string | null;
  area: Area | null;
  beliefBefore: string | null;
  evidence: string[];
  against: string[]; // evidence that cuts against it; never overlaps evidence
  alternatives: string[];
  decision: string | null;
  why: string | null;
  reversible: boolean | null;
  relatedTest: string | null;
  revisitOn: string | null; // the day Home asks what happened; decided records only
};

export function parseDecisionForm(fd: FormData): Parsed<DecisionInput> {
  const values: Record<string, string> = {};
  for (const k of ["title", "date", "status", "decideBy", "area", "beliefBefore", "alternatives", "decision", "why", "reversible", "relatedTest", "revisitOn"]) values[k] = text(fd, k);
  values.status ||= "decided";
  const evidence = all(fd, "evidence").filter(Boolean);
  const against = all(fd, "against").filter(Boolean);
  values.evidence = evidence.join(",");
  values.against = against.join(",");
  const errors: Record<string, string> = {};
  if (!values.title) errors.title = "Name the decision in a few words.";
  if (!isRealDate(values.date)) errors.date = "Add the date you recorded it.";
  if (values.status !== "open" && values.status !== "decided") errors.status = "Choose open or decided.";
  if (values.decideBy && !isRealDate(values.decideBy)) errors.decideBy = "Use a real decide-by date.";
  if (values.area && !oneOf(AREAS, values.area)) errors.area = "Pick an area from the list, or none.";
  if (values.revisitOn && !isRealDate(values.revisitOn)) errors.revisitOn = "Use a real revisit date.";
  else if (values.revisitOn && isRealDate(values.date) && values.revisitOn < values.date) errors.revisitOn = "Pick a revisit date on or after the decision's date.";
  if (against.some((p) => evidence.includes(p))) errors.against = "A record can be for or against, not both.";
  if (values.status === "decided" && !values.decision) errors.decision = "Say what you decided.";
  if (values.status === "decided" && !values.why) errors.why = "Say why. Future you will want to know.";
  if (values.status === "decided" && values.reversible !== "yes" && values.reversible !== "no") errors.reversible = "Say whether this is easy to undo.";
  const openConflict = "Choose ‘A decision already made,’ or clear this for an open question.";
  if (values.status === "open" && values.decision) errors.decision = openConflict;
  if (values.status === "open" && values.why) errors.why = openConflict;
  if (values.status === "open" && values.reversible) errors.reversible = openConflict;
  if (values.status === "open" && values.revisitOn) errors.revisitOn = openConflict;
  if (Object.keys(errors).length > 0) return { ok: false, errors, values };
  return {
    ok: true,
    values,
    input: {
      title: values.title,
      date: values.date,
      status: values.status as "open" | "decided",
      decideBy: orNull(values.decideBy),
      area: values.area ? (values.area as Area) : null,
      beliefBefore: orNull(values.beliefBefore),
      evidence,
      against,
      alternatives: lines(values.alternatives),
      decision: values.status === "decided" ? orNull(values.decision) : null,
      why: values.status === "decided" ? orNull(values.why) : null,
      reversible: values.status === "decided" ? (values.reversible === "yes" ? true : false) : null,
      relatedTest: orNull(values.relatedTest),
      revisitOn: values.status === "decided" ? orNull(values.revisitOn) : null,
    },
  };
}

/** Logs a decision made outside a venture test. Evidence for, evidence against and the related test must be records that exist. */
export async function createDecision(input: DecisionInput): Promise<string> {
  if (input.relatedTest && kindOf(input.relatedTest) !== "test") throw new Error("Pick the related test from the list.");
  const present = await existingPaths();
  const unknown = [...input.evidence, ...input.against, ...(input.relatedTest ? [input.relatedTest] : [])].find((p) => !present.has(p));
  if (unknown) throw new Error(`founder-data/${unknown} isn't there anymore. Reload the page and pick the evidence again.`);
  const data: Decision = { ...input };
  return createDated("decision", DECISIONS_DIR, input.date, input.title, data);
}

/** Resolves an open question in place so its original date, alternatives and evidence stay together. A revisit date is optional. */
export async function resolveDecision(path: string, input: { decision: string; why: string; reversible: string; revisitOn: string }): Promise<void> {
  const decision = input.decision.trim();
  const why = input.why.trim();
  const revisitOn = input.revisitOn.trim();
  if (!decision) throw new Error("Say what you decided.");
  if (!why) throw new Error("Say why. Future you will want to know.");
  if (input.reversible !== "yes" && input.reversible !== "no") throw new Error("Say whether this is easy to undo.");
  if (revisitOn && !isRealDate(revisitOn)) throw new Error("Use a real revisit date.");
  await updateEntry("decision", path, (data, body) => {
    if (!data) throw new Error("That decision no longer exists. Reload the page.");
    if (data.status !== "open") throw new Error("That question has already been decided. Reload the page.");
    if (revisitOn && revisitOn < data.date) throw new Error("Pick a revisit date on or after the decision's date.");
    return { data: { ...data, status: "decided", decision, why, reversible: input.reversible === "yes", ...(revisitOn ? { revisitOn } : {}) }, body };
  });
}

/**
 * Closes the loop: the founder says what came of a decided decision. Appends `## Outcome` below whatever the body
 * holds and records the day. Once per decision; the founder's words only.
 */
export async function recordOutcome(path: string, text: string, today: string): Promise<void> {
  const outcome = required(text, "Say what happened, even if it's “nothing yet”.");
  if (!isRealDate(today)) throw new Error("Use a real date.");
  await updateEntry("decision", path, (data, body) => {
    if (!data) throw new Error("That decision no longer exists. Reload the page.");
    if (data.status !== "decided") throw new Error("An open question has no outcome yet. Decide it first.");
    if (data.seeded) throw new Error("Confirm this imported decision first.");
    if (!data.revisitOn) throw new Error("This decision has no revisit date. Reload the page.");
    if (data.revisitedOn) throw new Error("That decision has already been revisited. Reload the page.");
    const kept = body.replace(/\s+$/, "");
    return { data: { ...data, revisitedOn: today }, body: `${kept ? `${kept}\n\n` : ""}## Outcome\n\n${outcome}\n` };
  });
}

/** Decisions newest first with their broken links, plus the records a new decision can cite. */
export async function loadDecisions(): Promise<{
  rows: DecisionRow[];
  flagged: { path: string; error: string }[];
  evidenceOptions: { path: string; label: string }[];
  tests: { path: string; title: string }[];
}> {
  const [entries, conversations, tests, present] = await Promise.all([listEntries("decision"), listEntries("conversation"), listEntries("test"), existingPaths()]);
  const rows = entries
    .flatMap((e) => (e.ok ? [{ path: e.path, data: e.data, broken: brokenLinks(linksOf("decision", e.data), (r) => present.has(r)), notes: e.body }] : []))
    .sort(byNewestDecision);
  const testOptions = tests.flatMap((t) => (t.ok ? [{ path: t.path, title: t.data.title }] : []));
  const evidenceOptions = [
    // Advice is never evidence (amendment §5.3), so each conversation says which it is.
    ...conversations.flatMap((c) =>
      c.ok ? [{ path: c.path, label: `Conversation · ${c.data.person} · ${c.data.date ?? "date unknown"} · ${isCustomerEvidence(c.data.type) ? "customer evidence" : "advice"}` }] : [],
    ),
    ...testOptions.map((t) => ({ path: t.path, label: `Test · ${t.title}` })),
  ];
  return { rows, flagged: entries.flatMap((e) => (e.ok ? [] : [{ path: e.path, error: e.error }])), evidenceOptions, tests: testOptions };
}
