import { dueWords } from "../core/due";
import { CONVERSATION_STEP } from "../core/home";
import type { TodayView } from "./today";

const byDue = (a: { due?: string | null }, b: { due?: string | null }) => (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31");

/** When an open commitment is due, in the same words as Home. */
const dueMarker = (due: string | null | undefined, week: string | null | undefined, today: string): string => {
  const words = dueWords({ due, week }, today);
  return words ? ` · ${words}` : "";
};

/** Today as plain text, in the app's order (amendment §5.2), with the ids an agent needs to write back. */
export function formatToday(view: TodayView): string {
  if (view.status === "setup") return "Setup isn't finished. Run node start.mjs from the repo root and finish setup in the browser.";
  if (view.status === "flagged") return `founder-data/${view.path} can't be read: ${view.error}\nFix it, then run pnpm check-data.`;
  const out: string[] = [];
  if (view.action) out.push(`Main action: ${view.action.label}`, `  Why: ${view.action.reason}`);
  else out.push("Main action: nothing is waiting");
  out.push(`Today: ${view.today} (week ${view.weekId}, starts ${view.weekStartsOn})`);
  out.push(`Outcome: ${view.checkin?.outcome ?? "not set"}`);
  if (view.founder.outcome30) out.push(`30-day outcome: ${view.founder.outcome30}`);
  const t2 = view.talkedTo;
  out.push(`Logged this week: ${t2.count} · your goal: ${t2.goal} (reached ${t2.reached}, replied ${t2.replied})`);
  const cur = view.path.current;
  const index = cur ? view.path.steps.findIndex((s) => s.id === cur.id) + 1 : 0;
  out.push(
    cur
      ? `Path: ${cur.title} (step ${index} of ${view.path.total})${cur.id === CONVERSATION_STEP || cur.discussed > 0 ? ` · ${cur.discussed} ${cur.discussed === 1 ? "person" : "people"} discussed it` : ""}${cur.planned ? ` · ${cur.planned} planned` : ""}`
      : `Path: ${view.path.allDone ? "every step done; choose this week's focus" : "no current step"}`,
  );
  const t = view.currentTest;
  out.push(t ? `Current test: ${t.title}${t.due ? ` · due ${t.due}` : ""} · ${t.linkedCount} linked · ${t.evidenceCount} customer evidence · strength ${t.evidenceStrength} (${t.path})` : `Current test: none running${view.plannedTests ? ` (${view.plannedTests} planned)` : ""}`);
  const commitments = view.checkin?.commitments ?? [];
  // Open commitments from earlier weeks carry here; each says the week whose check-in it lives in (write status back there).
  const open = [...commitments.filter((c) => c.status === "open").map((c) => ({ ...c, week: view.weekId })), ...view.carried].sort(byDue);
  const done = commitments.filter((c) => c.status === "done");
  const dropped = commitments.filter((c) => c.status === "dropped");
  out.push("Commitments:");
  if (open.length === 0) out.push("  none");
  for (const c of open) out.push(`  ${c.text}${dueMarker(c.due, c.week, view.today)}${c.week !== view.weekId ? ` · from week ${c.week}` : ""} (id ${c.id})`);
  if (done.length > 0) {
    out.push("Done this week:");
    for (const c of done) out.push(`  ${c.text} (id ${c.id})`);
  }
  if (dropped.length > 0) {
    out.push("Dropped this week:");
    for (const c of dropped) out.push(`  ${c.text} — ${c.reason} (id ${c.id})`);
  }
  // The same follow-ups as the JSON and the Today page: open, due today or earlier, oldest first.
  out.push("Follow-ups due:");
  if (view.followUps.length === 0) out.push("  none");
  for (const f of view.followUps) out.push(`  ${f.text} · ${dueWords({ due: f.due }, view.today)} (id ${f.id})`);
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
