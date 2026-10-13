import { factsFromFounder, guideStepForWeek, type GuideStep } from "../core/guide";
import { activeChoices, nextStep, type Candidate } from "../core/next-step";
import { currentWeek, weekFile } from "../core/program";
import { localISODate, resolveToday } from "../core/today";
import { addDays, isoWeekId, weekStart } from "../core/week";
import { checkData, type CheckReport } from "../store/check";
import { dataDir } from "../store/paths";
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

/** The founder's "today" for actions that stamp dates: founder.md may pin one; otherwise the local date. */
export async function loadFounderToday(): Promise<string> {
  const f = await readEntry("founder", "founder.md");
  return f?.ok ? resolveToday(f.data.today) : localISODate();
}

/** Values filled into prompts on the server: where the founder's files live, the venture's name and the founder's today. */
export async function loadPromptContext(): Promise<{ dataDir: string; venture: string; today: string }> {
  const f = await readEntry("founder", "founder.md");
  const founder = f?.ok ? f.data : null;
  return { dataDir: dataDir(), venture: founder?.venture || "my venture", today: founder ? resolveToday(founder.today) : localISODate() };
}
