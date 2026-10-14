import { commitmentActionId } from "./next-step";
import { addDays, isoWeekId } from "./week";

export type DueItem = { key: string; kind: "commitment" | "homework"; id: string; text: string; due: string | null; week: string | null };

const LAST = "9999-12-31";
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const at = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Open commitments (this week's and carried ones) and open program homework in one list, soonest first, undated last. */
export function dueItems(input: {
  commitments: { id: string; text: string; due?: string | null; status: string; week: string }[];
  homework: { id: string; title: string; due?: string | null; status: string }[];
}): DueItem[] {
  const items: DueItem[] = [
    ...input.commitments.filter((c) => c.status === "open").map((c): DueItem => ({ key: commitmentActionId(c.id, c.week), kind: "commitment", id: c.id, text: c.text, due: c.due ?? null, week: c.week })),
    ...input.homework.filter((h) => h.status === "open").map((h): DueItem => ({ key: `homework:${h.id}`, kind: "homework", id: h.id, text: h.title, due: h.due ?? null, week: null })),
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
