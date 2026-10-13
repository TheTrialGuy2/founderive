import type { TodayView } from "./today";

type Status = "open" | "done" | "dropped";
const openFirst = (a: { status: Status; due?: string | null }, b: { status: Status; due?: string | null }) =>
  (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31");

/** Today as plain text, in the app's order (amendment §5.2), with the ids an agent needs to write back. */
export function formatToday(view: TodayView): string {
  if (view.status === "setup") return "Setup isn't finished. Run node start.mjs from the repo root and finish setup in the browser.";
  if (view.status === "flagged") return `founder-data/${view.path} can't be read: ${view.error}\nFix it, then run pnpm check-data.`;
  const out: string[] = [];
  out.push(`Today: ${view.today} (week ${view.weekId}, starts ${view.weekStartsOn})`);
  out.push(`Outcome: ${view.checkin?.outcome ?? "not set"}`);
  if (view.next) out.push(`Next action: ${view.next.label}`, `  Why: ${view.next.reason}`, `  id: ${view.next.id}`);
  else out.push("Next action: nothing is waiting");
  const commitments = [...(view.checkin?.commitments ?? [])].sort(openFirst);
  out.push("Commitments:");
  if (commitments.length === 0) out.push("  none");
  for (const c of commitments) {
    const overdue = c.status === "open" && c.due && c.due < view.today ? " (overdue)" : "";
    out.push(`  [${c.status}] ${c.text}${c.due ? ` · due ${c.due}${overdue}` : ""} (id ${c.id})`);
  }
  const homework = view.homework.filter((h) => h.status === "open");
  if (homework.length > 0) {
    out.push(`Program week ${view.programWeek}:`);
    for (const h of homework) out.push(`  [open] ${h.title}${h.due ? ` · due ${h.due}` : ""} (id ${h.id})`);
  }
  out.push(`Blocker: ${view.checkin?.blocker ?? "none"}`);
  if (view.checkin?.helpNeeded) out.push(`Help needed: ${view.checkin.helpNeeded}`);
  if (view.report.errors.length > 0) out.push(`Files to fix: ${view.report.errors.map((e) => e.path).join(", ")}`);
  return out.join("\n");
}
