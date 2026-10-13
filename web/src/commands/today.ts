import { factsFromFounder, guideStepForWeek, type GuideStep } from "../core/guide";
import { activeChoices, nextStep, type Candidate } from "../core/next-step";
import { currentWeek, weekFile } from "../core/program";
import { resolveToday } from "../core/today";
import { addDays, isoWeekId, weekStart } from "../core/week";
import { checkData, type CheckReport } from "../store/check";
import { listEntries, readEntry, type Entry } from "../store/read";
import type { KindData } from "../store/schemas";
import { checkinPath } from "./checkin";

export type TodayView =
  | { status: "setup" }
  | { status: "flagged"; path: string; error: string }
  | {
      status: "ready";
      founder: KindData<"founder">;
      today: string;
      tomorrow: string;
      weekId: string;
      weekStartsOn: string;
      checkinEntry: Entry<"checkin"> | null;
      checkin: KindData<"checkin"> | null;
      programWeek: number | null;
      homework: KindData<"week">["homework"];
      guide: GuideStep | null;
      report: CheckReport;
      next: Candidate | null;
    };

/** Everything Today shows, read from founder-data at request time. An invalid founder.md comes back flagged, never thrown. */
export async function loadToday(): Promise<TodayView> {
  const founder = await readEntry("founder", "founder.md");
  if (!founder || (founder.ok && !founder.data.setupComplete)) return { status: "setup" };
  if (!founder.ok) return { status: "flagged", path: founder.path, error: founder.error };

  const f = founder.data;
  const today = resolveToday(f.today);
  const weekId = isoWeekId(today);
  const checkinEntry = await readEntry("checkin", checkinPath(weekId));
  const checkin = checkinEntry?.ok ? checkinEntry.data : null;
  // Deferrals can run past the week they were made in, so every readable check-in is consulted.
  const checkins = (await listEntries("checkin")).flatMap((e) => (e.ok ? [e.data] : []));

  const inProgram = !!(f.programTitle && f.programStart && f.programWeeks);
  const programWeek = inProgram ? currentWeek({ programStart: f.programStart, today, totalWeeks: f.programWeeks ?? 1, override: f.currentWeek }) : null;
  const weekEntry = programWeek ? await readEntry("week", weekFile(programWeek)) : null;
  const homework = weekEntry?.ok ? weekEntry.data.homework : [];

  const commitments = checkin?.commitments ?? [];
  const guide = guideStepForWeek(f.stage, factsFromFounder(f), commitments);
  const report = await checkData();

  const next = nextStep({
    today,
    outcome: checkin?.outcome,
    blocker: checkin?.blocker,
    risks: [],
    currentTests: [],
    commitments,
    followUps: [],
    guideStep: guide,
    programWork: homework.filter((h) => h.status === "open").map((h) => ({ id: h.id, title: h.title, due: h.due })),
    flagged: report.errors,
    choices: activeChoices(checkins, weekId, today),
  });

  return { status: "ready", founder: f, today, tomorrow: addDays(today, 1), weekId, weekStartsOn: weekStart(today), checkinEntry, checkin, programWeek, homework, guide, report, next };
}
