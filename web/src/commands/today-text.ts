import type { TodayView } from "./today";

const byDue = (a: { due?: string | null }, b: { due?: string | null }) => (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31");

/** The due marker for an open commitment: today, overdue (with its date) or a future date. */
const dueMarker = (due: string | null | undefined, today: string): string => {
  if (!due) return "";
  if (due === today) return " · due today";
  if (due < today) return ` · due ${due} (overdue)`;
  return ` · due ${due}`;
};

/** Today as plain text, in the app's order (amendment §5.2), with the ids an agent needs to write back. */
export function formatToday(view: TodayView): string {
  if (view.status === "setup") return "Setup isn't finished. Run node start.mjs from the repo root and finish setup in the browser.";
  if (view.status === "flagged") return `founder-data/${view.path} can't be read: ${view.error}\nFix it, then run pnpm check-data.`;
  const out: string[] = [];
  out.push(`Today: ${view.today} (week ${view.weekId}, starts ${view.weekStartsOn})`);
  out.push(`Outcome: ${view.checkin?.outcome ?? "not set"}`);
  if (view.founder.outcome30) out.push(`30-day outcome: ${view.founder.outcome30}`);
  if (view.next) out.push(`Next action: ${view.next.label}`, `  Why: ${view.next.reason}`, `  id: ${view.next.id}`);
  else out.push("Next action: nothing is waiting");
  const t = view.currentTest;
  out.push(t ? `Current test: ${t.title}${t.due ? ` · due ${t.due}` : ""} · ${t.linkedCount} linked · ${t.evidenceCount} customer evidence · strength ${t.evidenceStrength} (${t.path})` : `Current test: none running${view.plannedTests ? ` (${view.plannedTests} planned)` : ""}`);
  const commitments = view.checkin?.commitments ?? [];
  const open = [...commitments.filter((c) => c.status === "open")].sort(byDue);
  const done = commitments.filter((c) => c.status === "done");
  const dropped = commitments.filter((c) => c.status === "dropped");
  out.push("Commitments:");
  if (open.length === 0) out.push("  none");
  for (const c of open) out.push(`  ${c.text}${dueMarker(c.due, view.today)} (id ${c.id})`);
  if (done.length > 0) {
    out.push("Done this week:");
    for (const c of done) out.push(`  ${c.text} (id ${c.id})`);
  }
  if (dropped.length > 0) {
    out.push("Dropped this week:");
    for (const c of dropped) out.push(`  ${c.text} — ${c.reason} (id ${c.id})`);
  }
  if (view.capacity) out.push(`Capacity: ${view.capacity}`);
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
