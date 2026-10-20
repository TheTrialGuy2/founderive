import { capacityWarning } from "../core/capacity";
import { dueFollowUps, needsInterpretation } from "../core/conversations";
import { byNewestDecision, decisionHref } from "../core/decision-order";
import { synthesizable } from "../core/synthesis";
import { dueItems as buildDueItems, revisitDue, type DueItem } from "../core/due";
import { guideProgress, guideStepForWeek, type GuideStep } from "../core/guide";
import { homeAction, type HomeAction } from "../core/home";
import { activeChoices, nextStep, type Candidate } from "../core/next-step";
import { conversationDate, DEFAULT_TALK_GOAL, talkedToInWeek, type PathView } from "../core/path";
import { currentWeek, weekFile } from "../core/program";
import { slugOf } from "../core/slug";
import { localISODate, resolveToday } from "../core/today";
import { currentTest, type CurrentTest } from "../core/venture-tests";
import { addDays, isoWeekId, weekStart } from "../core/week";
import { checkData, type CheckReport } from "../store/check";
import { dataDir, repoRoot } from "../store/paths";
import { listEntries, readEntry, type Entry } from "../store/read";
import type { KindData } from "../store/schemas";
import { checkinPath, materializeRepeatingCommitments, weekOfCheckinPath } from "./checkin";
import { resolveCommitmentSources } from "./commitment-sources";
import { loadGuideFacts, loadLoopRecords, type LoopRecords } from "./loop";
import { loadPathFor } from "./path";

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
      currentTest: CurrentTest | null;
      plannedTests: number;
      followUps: { id: string; text: string; href: string; due: string }[];
      /** Open commitments from earlier weeks' check-ins, each with the week it lives in. They stay where they were written. */
      carried: CarriedCommitment[];
      capacity: string | null;
      path: PathView;
      talkedTo: { count: number; goal: number; reached: number; replied: number; lastWeekShort: number };
      /** Imported conversations (seeded) waiting for the founder to confirm them. They don't count as evidence until then. */
      importedWaiting: number;
      /** Confirmed customer conversations that record something: what a synthesis would read. Home shows the button from 3. */
      synthesizable: number;
      /** Confirmed records changed by an agent and waiting for Keep or Revert. */
      agentEditsWaiting: { count: number; href: string | null };
      /** Confirmed customer evidence waiting for the founder to say what it changes, oldest first. */
      changesWaiting: { path: string; person: string; date: string; href: string; areas: string[] }[];
      dueItems: DueItem[];
      action: HomeAction | null;
    };

/** `week` is the week in the check-in's file name, so a status change writes to `path`. */
export type CarriedCommitment = KindData<"checkin">["commitments"][number] & { week: string; path: string };

/**
 * Everything Home shows, read from founder-data at request time. An invalid founder.md comes back flagged, never thrown.
 * `preloaded` lets a caller that already read the loop records (the step page) share one snapshot with this view.
 */
export async function loadToday(preloaded?: LoopRecords): Promise<TodayView> {
  const founder = await readEntry("founder", "founder.md");
  if (!founder || (founder.ok && !founder.data.setupComplete)) return { status: "setup" };
  if (!founder.ok) return { status: "flagged", path: founder.path, error: founder.error };

  const f = founder.data;
  const today = resolveToday(f.today);
  const weekId = isoWeekId(today);
  // Preserve the existing flagged-file experience: an invalid current check-in is shown for repair, never hidden by
  // a failed attempt to materialise repeats into it.
  let checkinEntry = await readEntry("checkin", checkinPath(weekId));
  if (!checkinEntry || checkinEntry.ok) {
    await materializeRepeatingCommitments(weekId, weekStart(today), today);
    checkinEntry = await readEntry("checkin", checkinPath(weekId));
  }
  const checkin = checkinEntry?.ok ? checkinEntry.data : null;
  // Deferrals can run past the week they were made in, so every readable check-in is consulted.
  // The week each check-in belongs to comes from its FILE NAME, never its `week` field: actions write by file name, so
  // a hand-edited field can't send a write to another week's file (check-data flags the mismatch).
  const checkins = (await listEntries("checkin")).flatMap((e) => (e.ok ? [{ ...e.data, week: weekOfCheckinPath(e.path), path: e.path }] : []));
  // Open commitments carry lazily: read from the earlier week's file, never moved or copied (done/dropped write back there).
  const carried: CarriedCommitment[] = checkins
    .filter((c) => c.week < weekId)
    .sort((a, b) => a.week.localeCompare(b.week))
    .flatMap((c) => c.commitments.filter((x) => x.status === "open" && !x.repeat).map((x) => ({ ...x, week: c.week, path: c.path })));

  const inProgram = !!(f.programTitle && f.programStart && f.programWeeks);
  const programWeek = inProgram ? currentWeek({ programStart: f.programStart, today, totalWeeks: f.programWeeks ?? 1, override: f.currentWeek }) : null;
  const weekEntry = programWeek ? await readEntry("week", weekFile(programWeek)) : null;
  // Imported program content is a draft. It cannot become Due or Home's main action until the founder confirms it.
  const homework = weekEntry?.ok && !weekEntry.data.seeded ? weekEntry.data.homework : [];
  const openHomework = homework.filter((h) => h.status === "open");

  const commitments = checkin?.commitments.filter((commitment) => !commitment.repeat) ?? [];
  const ranked = [...commitments.map((c) => ({ ...c, week: weekId })), ...carried];
  const records = preloaded ?? (await loadLoopRecords());
  const facts = await loadGuideFacts(f, records);
  const guide = guideStepForWeek(f.stage, facts, ranked);
  const report = await checkData();
  const followUps = dueFollowUps(records.conversations, today);
  const decisionHorizon = addDays(today, 7);
  // Decisions are paginated newest first, so a link lands on the page the record is on (core/decision-order).
  const decisionRows = (await listEntries("decision")).flatMap((entry) => (entry.ok ? [entry] : [])).sort(byNewestDecision);
  const openDecisions = decisionRows.flatMap((entry, index) => {
    if (entry.data.seeded || entry.data.status !== "open" || !entry.data.decideBy || entry.data.decideBy > decisionHorizon) return [];
    return [{ id: entry.path, title: entry.data.title, decideBy: entry.data.decideBy, href: decisionHref(index, entry.path) }];
  });
  // A decided decision whose revisit date has come and that has no outcome yet. Never before the date, never an import.
  const revisits = decisionRows.flatMap((entry, index) => {
    if (!revisitDue(entry.data, today)) return [];
    return [{ id: entry.path, title: entry.data.title, href: decisionHref(index, entry.path), revisitOn: entry.data.revisitOn! }];
  });

  const next = nextStep({
    today,
    weekId,
    outcome: checkin?.outcome,
    blocker: checkin?.blocker,
    risks: [],
    currentTests: records.tests
      // An imported test the founder hasn't confirmed isn't resumed: its criteria aren't theirs yet.
      .filter((t) => t.data.status === "running" && !t.data.seeded)
      .map((t) => ({ path: t.path, title: t.data.title, href: `/tests/${slugOf(t.path)}`, due: t.data.due })),
    commitments: ranked,
    followUps,
    guideStep: guide ? { id: guide.id, title: guide.title, why: guide.why, progress: guideProgress(guide, facts) } : null,
    programWork: openHomework.map((h) => ({ id: h.id, title: h.title, due: h.due })),
    flagged: report.errors,
    choices: activeChoices(checkins, weekId, today),
  });

  const path = await loadPathFor({ setupComplete: f.setupComplete, focus: checkin?.focus, openCommitments: ranked.filter((c) => c.status === "open"), records });
  const lastWeekId = isoWeekId(addDays(today, -7));
  const lastCheckin = checkins.find((c) => c.week === lastWeekId);
  const goal = checkin?.talkGoal ?? f.weeklyTalkGoal ?? DEFAULT_TALK_GOAL;
  const lastGoal = lastCheckin?.talkGoal ?? f.weeklyTalkGoal ?? DEFAULT_TALK_GOAL;
  const customerOutreach = checkin?.outreach?.find((row) => row.audience === "customer");
  const talkedTo = {
    count: talkedToInWeek(records.conversations, weekId),
    goal,
    reached: customerOutreach?.reached ?? 0,
    replied: customerOutreach?.replied ?? 0,
    // Only a week the founder was using Founderive counts: Founderive keeps no setup date, so last week's check-in is
    // the sign. A founder in their first week has no shortfall.
    lastWeekShort: lastCheckin ? Math.max(0, lastGoal - talkedToInWeek(records.conversations, lastWeekId)) : 0,
  };
  const importedWaiting = records.conversations.filter((c) => c.data.seeded).length;
  const synthesizableCount = synthesizable(records.conversations).length;
  const editedBlocks = (await listEntries("canvasBlock")).flatMap((entry) => (entry.ok && entry.data.agentEdit ? [{ href: `/canvas/${entry.data.id}` }] : []));
  const editedConversations = records.conversations.flatMap((entry) => (entry.data.agentEdit ? [{ href: `/conversations/${slugOf(entry.path)}` }] : []));
  const pendingAgentEdits = [...editedBlocks, ...editedConversations];
  const agentEditsWaiting = { count: pendingAgentEdits.length, href: pendingAgentEdits[0]?.href ?? null };
  const changesWaiting = records.conversations
    .filter((c) => needsInterpretation(c.data, c.notes))
    .sort((a, b) => conversationDate(a).localeCompare(conversationDate(b)) || a.path.localeCompare(b.path))
    .map((c) => ({ path: c.path, person: c.data.person, date: conversationDate(c), href: `/conversations/${slugOf(c.path)}`, areas: c.data.areas }));
  // Where each linked commitment came from, read once per distinct link. A missing or unreadable source leaves the commitment without its line.
  const sources = await resolveCommitmentSources(ranked.filter((c) => c.status === "open").map((c) => c.link));
  const dueList = buildDueItems({ commitments: ranked, homework, followUps, decisions: openDecisions, revisits, sources });
  const action = homeAction({
    today,
    risk: next && next.tier === 1 ? { label: next.label, reason: next.reason, href: next.href ?? "/today" } : null,
    outcome: checkin?.outcome,
    blocker: checkin?.blocker,
    due: dueList,
    importedWaiting,
    changesWaiting,
    path,
  });

  const openCount = ranked.filter((c) => c.status === "open").length + openHomework.length;
  return {
    status: "ready",
    founder: f,
    today,
    tomorrow: addDays(today, 1),
    weekId,
    weekStartsOn: weekStart(today),
    checkinEntry,
    checkin,
    programWeek,
    homework,
    guide,
    report,
    next,
    // One rule for evidence (core/conversations): reciprocal links to confirmed customer conversations that record something.
    currentTest: currentTest(records.tests, records.conversations),
    plannedTests: records.tests.filter((t) => t.data.status === "planned").length,
    followUps,
    carried,
    capacity: capacityWarning(f.hoursPerWeek, f.commitment, openCount),
    path,
    talkedTo,
    importedWaiting,
    synthesizable: synthesizableCount,
    agentEditsWaiting,
    changesWaiting,
    dueItems: dueList,
    action,
  };
}

/**
 * Refuses a write from a page loaded in an earlier week: a hidden `week` field from an open tab would otherwise write
 * to last week's check-in.
 */
export async function assertThisWeek(weekId: string): Promise<void> {
  if (weekId !== isoWeekId(await loadFounderToday())) throw new Error("This page is from an earlier week. Reload to see this week.");
}

/** The founder's "today" for actions that stamp dates: founder.md may pin one; otherwise the local date. */
export async function loadFounderToday(): Promise<string> {
  const f = await readEntry("founder", "founder.md");
  return f?.ok ? resolveToday(f.data.today) : localISODate();
}

/** Values filled into prompts on the server: where the founder's files live, the app's repo root, the venture's name and the founder's today. */
export async function loadPromptContext(): Promise<{ dataDir: string; repo: string; venture: string; today: string }> {
  const f = await readEntry("founder", "founder.md");
  const founder = f?.ok ? f.data : null;
  return { dataDir: dataDir(), repo: repoRoot(), venture: founder?.venture || "my venture", today: founder ? resolveToday(founder.today) : localISODate() };
}
