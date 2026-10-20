import type { CommitmentSource } from "./commitment-source";
import { commitmentActionId } from "./next-step";
import { addDays, isoWeekId } from "./week";

/**
 * `href` is set for a follow-up (its conversation), a decision and a revisit (the decision's card). A follow-up's `id`
 * is `<conversation path>#<follow-up id>`. `source` is set on a commitment whose link names a readable conversation,
 * decision or test: where it came from, not where it lives.
 */
export type DueItem = { key: string; kind: "commitment" | "homework" | "followup" | "decision" | "revisit"; id: string; text: string; due: string | null; week: string | null; href?: string; source?: CommitmentSource };

const LAST = "9999-12-31";
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Open commitments (this week's and carried ones), open program homework, follow-ups due (open, due today or
 * earlier, as `dueFollowUps` returns them), open decisions with a decide-by date and decided decisions whose revisit
 * date has come (the caller filters by date), in one list, soonest first, undated last.
 */
export function dueItems(input: {
  commitments: { id: string; text: string; due?: string | null; status: string; week: string; link?: string | null }[];
  homework: { id: string; title: string; due?: string | null; status: string }[];
  followUps?: { id: string; text: string; href: string; due: string }[];
  decisions?: { id: string; title: string; href: string; decideBy: string }[];
  revisits?: { id: string; title: string; href: string; revisitOn: string }[];
  /** Resolved sources by commitment link (Task 9's loader fills it). A link with no entry gets no source. */
  sources?: Map<string, CommitmentSource>;
}): DueItem[] {
  const items: DueItem[] = [
    ...input.commitments.filter((c) => c.status === "open").map((c): DueItem => {
      const source = c.link ? input.sources?.get(c.link) : undefined;
      return { key: commitmentActionId(c.id, c.week), kind: "commitment", id: c.id, text: c.text, due: c.due ?? null, week: c.week, ...(source ? { source } : {}) };
    }),
    ...input.homework.filter((h) => h.status === "open").map((h): DueItem => ({ key: `homework:${h.id}`, kind: "homework", id: h.id, text: h.title, due: h.due ?? null, week: null })),
    ...(input.followUps ?? []).map((f): DueItem => ({ key: `followup:${f.id}`, kind: "followup", id: f.id, text: f.text, due: f.due, week: null, href: f.href })),
    ...(input.decisions ?? []).map((d): DueItem => ({ key: `decision:${d.id}`, kind: "decision", id: d.id, text: `Decide: ${d.title}`, due: d.decideBy, week: null, href: d.href })),
    ...(input.revisits ?? []).map((r): DueItem => ({ key: `revisit:${r.id}`, kind: "revisit", id: r.id, text: `What happened after: ${r.title.replace(/\?+\s*$/, "")}?`, due: r.revisitOn, week: null, href: r.href })),
  ];
  return items.sort((a, b) => (a.due ?? LAST).localeCompare(b.due ?? LAST));
}

/** The loop on a decision is open: decided, the founder's own (not an import), the revisit date has come, and nothing has been recorded. Home and the card both use this, so they can't drift. */
export const revisitDue = (d: { status: string; seeded?: boolean; revisitOn?: string | null; revisitedOn?: string | null }, today: string): boolean =>
  d.status === "decided" && !d.seeded && !!d.revisitOn && d.revisitOn <= today && !d.revisitedOn;

/** When something is due, in words: "due today", "due Fri", "from last week", "from Sep 30". Never "overdue". */
export function dueWords(item: { due?: string | null; week?: string | null }, today: string): string {
  const thisWeek = isoWeekId(today);
  const lastWeek = isoWeekId(addDays(today, -7));
  if (item.due) {
    if (item.due === today) return "due today";
    const week = isoWeekId(item.due);
    if (week === thisWeek) return `due ${WEEKDAY.format(at(item.due))}`;
    if (item.due < today) return week === lastWeek ? "from last week" : `from ${MONTH_DAY.format(at(item.due))}`;
    return `due ${MONTH_DAY.format(at(item.due))}`;
  }
  if (item.week && item.week !== thisWeek) return item.week === lastWeek ? "from last week" : `from week ${item.week}`;
  return "";
}
