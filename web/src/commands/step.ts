import { discussesStep, type PathConversation, type PathStep } from "../core/path";
import { isCustomerEvidence } from "../core/conversations";
import { slugOf } from "../core/slug";
import { byNewest, challengers, stanceCounts, type StanceCounts } from "../core/stance";
import type { TestStatus } from "../store/schemas";
import { TYPE_LABELS } from "../lib/loop-labels";
import { loadLoopRecords } from "./loop";
import { loadToday } from "./today";
import { isCommitmentInstance } from "../core/commitments";

export type StepCard = { slug: string; person: string; role: string; date: string | null; line: string | null; changed: string | null };
/** An open conversation planned for this step: a commitment linked `step:<id>`, in the check-in it lives in. */
export type PlannedConversation = { week: string; id: string; text: string; due: string | null };

/** One person on the step page: who, their role, when, their first quote or line of notes, and what it changed once confirmed. */
const toCard = (c: PathConversation): StepCard => ({
  slug: slugOf(c.path),
  person: c.data.person,
  role: c.data.segment || c.data.org || TYPE_LABELS[c.data.type],
  date: c.data.date ?? null,
  line: c.data.quotes[0] ?? (c.notes.trim().split("\n")[0] || null),
  changed: c.data.whatChangesConfirmed ? (c.data.whatChanges ?? null) : null,
});

/**
 * One path step, with its place on the path, the people who discussed it (feedback conversations, newest first), how
 * their stances split, the ones that challenge the belief, the conversations planned for it and its tests. The loop
 * records are read once, so every part is the same snapshot.
 */
export async function loadStep(id: string): Promise<
  | { status: "setup" | "missing" }
  | {
      status: "ready";
      step: PathStep;
      steps: PathStep[];
      index: number;
      total: number;
      nextStep: PathStep | null;
      weekId: string;
      today: string;
      people: StepCard[];
      /** The founder's stances among `people`; a conversation with none, or `neither`, is in neither lane. */
      counts: StanceCounts;
      /** The people whose conversation the founder marked as challenging this belief, newest first. */
      challengers: StepCard[];
      planned: PlannedConversation[];
      tests: { slug: string; title: string; status: TestStatus }[];
      /** Imported customer and prospect conversations waiting for the founder; only those can become customer evidence. */
      importedCustomers: number;
    }
> {
  const records = await loadLoopRecords();
  const view = await loadToday(records);
  if (view.status !== "ready") return { status: "setup" };
  const i = view.path.steps.findIndex((s) => s.id === id);
  if (i < 0) return { status: "missing" };
  const people = records.conversations.filter((c) => discussesStep(c, id)).sort(byNewest).map(toCard);
  const counts = stanceCounts(records.conversations, id);
  const challenging = challengers(records.conversations, id).map(toCard);
  const planned = [...(view.checkin?.commitments ?? []).filter(isCommitmentInstance).map((c) => ({ ...c, week: view.weekId })), ...view.carried]
    .filter((c) => c.status === "open" && c.link === `step:${id}`)
    .map((c): PlannedConversation => ({ week: c.week, id: c.id, text: c.text, due: c.due ?? null }))
    .sort((a, b) => (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31") || a.week.localeCompare(b.week));
  const importedCustomers = records.conversations.filter((c) => c.data.seeded && isCustomerEvidence(c.data.type)).length;
  const tests = records.tests.filter((t) => t.data.area === id).map((t) => ({ slug: slugOf(t.path), title: t.data.title, status: t.data.status }));
  return { status: "ready", step: view.path.steps[i], steps: view.path.steps, index: i + 1, total: view.path.total, nextStep: view.path.steps[i + 1] ?? null, weekId: view.weekId, today: view.today, people, counts, challengers: challenging, planned, tests, importedCustomers };
}
