import { conversationDate, isFeedbackConversation } from "../core/path";
import { slugOf } from "../core/slug";
import { TYPE_LABELS } from "../lib/loop-labels";
import { listEntries } from "../store/read";
import { loadLoopRecords } from "./loop";

export type PersonCard = { path: string; slug: string; person: string; role: string; date: string; line: string | null; feedback: boolean; imported: boolean; steps: string[] };
export type LoggedRow = { kind: "conversation" | "test" | "decision"; title: string; href: string; date: string };
export type PeopleFilter = "feedback" | "all" | "imported";

/**
 * Everyone the founder has logged, newest first. "feedback" keeps the conversations that count toward people talked
 * to; "imported" keeps the imported ones (seeded) waiting for the founder to confirm them. `imported` counts those
 * whatever the filter, and `flaggedImports` lists imported files that can't be read, so they can be fixed.
 */
export async function loadPeople(show: PeopleFilter): Promise<{ cards: PersonCard[]; total: number; imported: number; flaggedImports: { path: string; error: string }[] }> {
  const entries = await listEntries("conversation");
  const cards = entries
    .flatMap((e) => (e.ok ? [{ path: e.path, data: e.data, notes: e.body }] : []))
    .map(
      (c): PersonCard => ({
        path: c.path,
        slug: slugOf(c.path),
        person: c.data.person,
        role: c.data.segment || c.data.org || TYPE_LABELS[c.data.type],
        date: conversationDate(c),
        line: c.data.quotes[0] ?? (c.notes.trim().split("\n")[0] || null),
        feedback: isFeedbackConversation(c),
        imported: !!c.data.seeded,
        steps: c.data.areas,
      }),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  const flaggedImports = entries.flatMap((e) => (!e.ok && e.seeded ? [{ path: e.path, error: e.error }] : []));
  const kept = show === "all" ? cards : show === "imported" ? cards.filter((c) => c.imported) : cards.filter((c) => c.feedback);
  return { cards: kept, total: cards.length, imported: cards.filter((c) => c.imported).length, flaggedImports };
}

/** Conversations, tests and decisions in one list, newest first. `type` narrows to one kind; `q` matches titles, ignoring case. */
export async function loadLogged(filter: { type: string; q: string }): Promise<{ rows: LoggedRow[]; total: number }> {
  const { conversations, tests } = await loadLoopRecords();
  const decisions = (await listEntries("decision")).flatMap((e) => (e.ok ? [{ path: e.path, data: e.data }] : []));
  const fileDate = (rel: string) => rel.slice(rel.lastIndexOf("/") + 1).slice(0, 10);
  const rows: LoggedRow[] = [
    ...conversations.map((c): LoggedRow => ({ kind: "conversation", title: c.data.org ? `${c.data.person} · ${c.data.org}` : c.data.person, href: `/conversations/${slugOf(c.path)}`, date: conversationDate(c) })),
    ...tests.map((t): LoggedRow => ({ kind: "test", title: t.data.title, href: `/tests/${slugOf(t.path)}`, date: fileDate(t.path) })),
    // Decisions have no per-item anchor on /decisions, so link to the list rather than a fragment that doesn't exist.
    ...decisions.map((d): LoggedRow => ({ kind: "decision", title: d.data.title, href: `/decisions`, date: d.data.date })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  const q = filter.q.trim().toLowerCase();
  const kept = rows.filter((r) => (!filter.type || r.kind === filter.type) && (!q || r.title.toLowerCase().includes(q)));
  return { rows: kept, total: rows.length };
}
