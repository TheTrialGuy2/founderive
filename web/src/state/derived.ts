// Values computed from the live demo state. Every screen reads numbers from here,
// so a number is never typed twice.
import { TODAY } from "@/config";
import { daysBetween } from "@/core/engagement";
import { countConversations, latestValue, parseAmount } from "@/core/metrics";
import { canShareWith, readinessStatus, type Readiness } from "@/core/readiness";
import { weekActivity, weekStreak } from "@/core/streak";
import { seed } from "@/data/repo";
import { dana } from "@/data/fixtures/founders";
import type { Conversation, FollowUp, FounderBasics, FounderRecord, HomeworkItem, Metric, Program, ProfileAnswer, ReportedField, Session } from "@/data/types";

export const isHomeworkDone = (h: HomeworkItem) => h.evidenceIds.length >= h.required;

export function programSteps(programs: Program[], programId: string) {
  const items = programs.find((p) => p.id === programId)?.sessions.flatMap((s) => s.homework) ?? [];
  return { done: items.filter(isHomeworkDone).length, total: items.length };
}

/** The next session on or after today, or the last one. */
export function currentSession(program: Program): Session | undefined {
  return program.sessions.find((s) => s.date >= TODAY) ?? program.sessions.at(-1);
}

export function metricValue(metric: Metric, conversations: Conversation[]) {
  if (metric.kind === "count" && metric.countingRule) {
    const { count, excluded } = countConversations(conversations, metric.countingRule);
    return { value: count, excluded, observedAt: TODAY };
  }
  const latest = latestValue(seed.observations.filter((o) => o.metricId === metric.id));
  return { value: latest?.value ?? metric.baseline, excluded: [], observedAt: latest?.observedAt ?? metric.baselineAt };
}

export const interviewMetric = () => seed.metrics.find((m) => m.id === "m-interviews")!;

export function interviewCount(conversations: Conversation[]) {
  return metricValue(interviewMetric(), conversations).value;
}

/** Interviews that count under the metric's rule and happened in the last `days` days. */
export function recentDiscovery(conversations: Conversation[], days = 30) {
  const rule = interviewMetric().countingRule!;
  const recent = conversations.filter((c) => daysBetween(c.occurredAt, TODAY) <= days);
  const { excluded } = countConversations(recent, rule);
  return recent.filter((c) => c.type === rule.type && !excluded.includes(c));
}

/** Weeks in a row with at least one counted customer conversation, plus the last 8 weeks as dots. */
export function interviewStreak(conversations: Conversation[]) {
  const rule = interviewMetric().countingRule!;
  const { excluded } = countConversations(conversations, rule);
  const dates = conversations.filter((c) => c.type === rule.type && !excluded.includes(c)).map((c) => c.occurredAt);
  const weeks = weekActivity(dates, TODAY, 8);
  return { streak: weekStreak(weeks), weeks };
}

export function readinessRows(conversations: Conversation[]) {
  return seed.readinessCriteria.map((c) => {
    let evidence = c.evidence;
    if (c.key === "idea") evidence = [...evidence, `${interviewCount(conversations)} counted interviews`];
    if (c.key === "momentum") evidence = recentDiscovery(conversations).map((x) => `Discovery: ${x.org} (${x.occurredAt})`);
    const status: Readiness = readinessStatus(c.required, evidence.length);
    return { ...c, evidence, status };
  });
}

export type OpenFollowUp = FollowUp & { ageDays: number; overdue: boolean };

export function openFollowUps(conversations: Conversation[]) {
  const all: OpenFollowUp[] = conversations
    .flatMap((c) => c.followUps)
    .filter((f) => f.status === "open")
    .map((f) => ({ ...f, ageDays: Math.max(0, daysBetween(f.dueAt, TODAY)), overdue: f.dueAt < TODAY }));
  return {
    mine: all.filter((f) => f.owner === "founder").sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    waiting: all.filter((f) => f.owner === "other").sort((a, b) => b.ageDays - a.ageDays),
  };
}

/** Reported fields with the founder's check-in corrections applied. A correction is self-reported. */
export function reportedWithEdits(edits: Record<string, string>): ReportedField[] {
  return seed.reportedFields.map((f) =>
    edits[f.key] !== undefined
      ? { ...f, value: edits[f.key], verification: "self_reported", numeric: f.numeric === undefined ? undefined : parseAmount(edits[f.key]) }
      : f,
  );
}

export function supportedCount(conversations: Conversation[]) {
  return readinessRows(conversations).filter((r) => r.status === "supported").length;
}

/** The cohort session that's next, as "Session 5 of 10". */
export function sessionLabel(program: Program) {
  const s = currentSession(program)!;
  return { n: s.n, of: program.sessions.length, date: s.date };
}

/** Dana's full three-layer record, assembled from live state. */
export function currentRecord(state: {
  conversations: Conversation[];
  programs: Program[];
  profile: ProfileAnswer[];
  basics: FounderBasics;
  reportedEdits: Record<string, string>;
}): FounderRecord {
  const steps = programSteps(state.programs, "esc");
  return {
    founder: { ...dana, ...state.basics, profile: state.profile },
    conversations: state.conversations,
    contacts: seed.privateNotes.contacts,
    notes: seed.privateNotes.notes,
    finances: seed.privateNotes.finances,
    programProgress: { programId: "esc", stepsDone: steps.done, stepsTotal: steps.total },
    mentorMeetings: seed.mentorMeetings,
    reported: reportedWithEdits(state.reportedEdits),
  };
}

export interface NextAction {
  title: string;
  effort: string;
  why: string;
  href: string;
}

/**
 * The single most useful thing to do now, in priority order: this week's interview homework,
 * then the halfway check, then sharing a readiness profile, then mentor prep.
 */
export function nextAction(state: { conversations: Conversation[]; programs: Program[]; optIns: string[] }): NextAction {
  const session = currentSession(state.programs.find((p) => p.id === "esc")!)!;
  const open = (h: HomeworkItem) => !isHomeworkDone(h) && !h.skippedReason;
  const interviews = session.homework.find((h) => open(h) && h.builds.toLowerCase().includes("interview"));
  if (interviews) {
    return {
      title: "Talk to one more agency owner",
      effort: "30 min",
      why: `Session ${session.n} homework is at ${interviews.evidenceIds.length} of ${interviews.required}, and it keeps your streak going.`,
      href: "/founder/conversations/new",
    };
  }
  const halfway = session.homework.find((h) => open(h) && h.builds.startsWith("Milestones"));
  if (halfway) {
    return {
      title: "Do your halfway check",
      effort: "10 min",
      why: `Due before Session ${session.n}. It unlocks pitch night.`,
      href: `/founder/programs/esc/sessions/${session.n}`,
    };
  }
  const supported = supportedCount(state.conversations);
  const shareable = seed.capitalPartners.find((p) => canShareWith(p, supported) && !state.optIns.includes(p.id));
  if (shareable) {
    return {
      title: "Share your readiness profile",
      effort: "2 min",
      why: `You now meet ${shareable.name}'s bar (${shareable.minSupported} of 7 criteria).`,
      href: "/founder/capital",
    };
  }
  return {
    title: "Prep your mentor agenda",
    effort: "10 min",
    why: "It's pre-filled from your record. Review it and share it before the meeting.",
    href: "/founder/mentors",
  };
}
