import { currentWeek, weekFile } from "../core/program";
import { resolveToday } from "../core/today";
import { listEntries, readEntry } from "../store/read";
import { isoDate, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";

export type ProgramWeekRow = { path: string; data: KindData<"week"> } | { path: string; error: string };
export type ProgramView =
  | { status: "none" }
  | { status: "flagged"; path: string; error: string }
  | { status: "ready"; title: string; current: number | null; total: number; weeks: ProgramWeekRow[] };

export async function loadProgram(): Promise<ProgramView> {
  const founder = await readEntry("founder", "founder.md");
  if (founder && !founder.ok) return { status: "flagged", path: founder.path, error: founder.error };
  if (!founder?.ok || !founder.data.programTitle || !founder.data.programStart || !founder.data.programWeeks) return { status: "none" };
  const entries = new Map((await listEntries("week")).map((entry) => [entry.path, entry]));
  const weeks: ProgramWeekRow[] = [];
  for (let n = 1; n <= founder.data.programWeeks; n++) {
    const path = weekFile(n);
    const entry = entries.get(path);
    if (!entry) weeks.push({ path, error: "This program week is missing." });
    else if (!entry.ok) weeks.push({ path, error: entry.error });
    else weeks.push({ path, data: entry.data });
  }
  return {
    status: "ready",
    title: founder.data.programTitle,
    current: currentWeek({ programStart: founder.data.programStart, today: resolveToday(founder.data.today), totalWeeks: founder.data.programWeeks, override: founder.data.currentWeek }),
    total: founder.data.programWeeks,
    weeks,
  };
}

export async function loadProgramWeek(week: number) {
  if (!Number.isInteger(week) || week < 1) return null;
  return readEntry("week", weekFile(week));
}

/** Records that a blank program session happened, without inventing exercises or homework. */
export async function markSessionHeld(week: number, date: string, note: string): Promise<void> {
  if (!isoDate.safeParse(date).success) throw new Error("Add the date the session was held.");
  const rel = weekFile(week);
  await updateEntry("week", rel, (data, body) => {
    if (!data) throw new Error(`founder-data/${rel} doesn't exist.`);
    if (data.exercises.length > 0 || data.homework.length > 0) throw new Error("This week already has recorded material. Update its status in the file instead.");
    const extra = note.trim();
    return { data: { ...data, status: "done", date }, body: extra ? `${body.trim()}${body.trim() ? "\n\n" : ""}${extra}\n` : body };
  });
}
