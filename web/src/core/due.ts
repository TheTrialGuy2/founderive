import { commitmentActionId } from "./next-step";
import { addDays, isoWeekId } from "./week";

/** `href` is set for a follow-up: the conversation it belongs to. A follow-up's `id` is `<conversation path>#<follow-up id>`. */
export type DueItem = { key: string; kind: "commitment" | "homework" | "followup" | "decision"; id: string; text: string; due: string | null; week: string | null; href?: string };

const LAST = "9999-12-31";
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Open commitments (this week's and carried ones), open program homework and follow-ups due (open, due today or
 * earlier, as `dueFollowUps` returns them) in one list, soonest first, undated last.
 */
export function dueItems(input: {
  commitments: { id: string; text: string; due?: string | null; status: string; week: string }[];
  homework: { id: string; title: string; due?: string | null; status: string }[];
  followUps?: { id: string; text: string; href: string; due: string }[];
  decisions?: { id: string; title: string; href: string; decideBy: string }[];
}): DueItem[] {
  const items: DueItem[] = [
    ...input.commitments.filter((c) => c.status === "open").map((c): DueItem => ({ key: commitmentActionId(c.id, c.week), kind: "commitment", id: c.id, text: c.text, due: c.due ?? null, week: c.week })),
    ...input.homework.filter((h) => h.status === "open").map((h): DueItem => ({ key: `homework:${h.id}`, kind: "homework", id: h.id, text: h.title, due: h.due ?? null, week: null })),
    ...(input.followUps ?? []).map((f): DueItem => ({ key: `followup:${f.id}`, kind: "followup", id: f.id, text: f.text, due: f.due, week: null, href: f.href })),
    ...(input.decisions ?? []).map((d): DueItem => ({ key: `decision:${d.id}`, kind: "decision", id: d.id, text: `Decide: ${d.title}`, due: d.decideBy, week: null, href: d.href })),
  ];
  return items.sort((a, b) => (a.due ?? LAST).localeCompare(b.due ?? LAST));
}

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
