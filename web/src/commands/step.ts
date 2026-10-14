import { isFeedbackConversation, type PathStep } from "../core/path";
import { slugOf } from "../core/slug";
import type { TestStatus } from "../store/schemas";
import { TYPE_LABELS } from "../lib/loop-labels";
import { loadLoopRecords } from "./loop";
import { loadToday } from "./today";

export type StepCard = { slug: string; person: string; role: string; date: string | null; line: string | null; changed: string | null };

/** One path step, with its place on the path, the people who discussed it (feedback conversations, newest first) and its tests. */
export async function loadStep(id: string): Promise<
  | { status: "setup" | "missing" }
  | { status: "ready"; step: PathStep; index: number; total: number; nextStep: PathStep | null; weekId: string; people: StepCard[]; tests: { slug: string; title: string; status: TestStatus }[] }
> {
  const view = await loadToday();
  if (view.status !== "ready") return { status: "setup" };
  const i = view.path.steps.findIndex((s) => s.id === id);
  if (i < 0) return { status: "missing" };
  const records = await loadLoopRecords();
  const people = records.conversations
    .filter((c) => isFeedbackConversation(c) && (c.data.areas.includes(id) || (id === "customer" && c.data.areas.length === 0)))
    .sort((a, b) => (b.data.date ?? "").localeCompare(a.data.date ?? ""))
    .map(
      (c): StepCard => ({
        slug: slugOf(c.path),
        person: c.data.person,
        role: c.data.segment || c.data.org || TYPE_LABELS[c.data.type],
        date: c.data.date ?? null,
        line: c.data.quotes[0] ?? c.notes.trim().split("\n")[0] ?? null,
        changed: c.data.whatChangesConfirmed ? (c.data.whatChanges ?? null) : null,
      }),
    );
  const tests = records.tests.filter((t) => t.data.area === id).map((t) => ({ slug: slugOf(t.path), title: t.data.title, status: t.data.status }));
  return { status: "ready", step: view.path.steps[i], index: i + 1, total: view.path.total, nextStep: view.path.steps[i + 1] ?? null, weekId: view.weekId, people, tests };
}
