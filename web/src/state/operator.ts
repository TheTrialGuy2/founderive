// Program-team rollups. Dana's row comes from live state; everyone else from fixtures.
import { CURRENT_FOUNDER_ID, TODAY } from "@/config";
import { engagementStatus } from "@/core/engagement";
import { weekActivity } from "@/core/streak";
import { PHASES, getFounder, getFounderOutcomes, listCohortMembers, listFounders, seed } from "@/data/repo";
import type { CapitalIntro, CohortMember, FounderRecord, Phase, Program } from "@/data/types";
import { isHomeworkDone, programSteps, reportedWithEdits } from "./derived";

interface LiveState {
  conversations: { occurredAt: string }[];
  programs: Program[];
  checkinConfirmed: boolean;
  optIns: string[];
  reportedEdits: Record<string, string>;
}

/** Weeks since the cohort started (Session 1 was the week of Sep 14). */
export const COHORT_WEEKS = 5;

type CohortRow = CohortMember & { name: string; venture: string; lastActivity: string };

export function cohortRows(state: LiveState): CohortRow[] {
  const steps = programSteps(state.programs, "esc");
  const halfwayDone = state.programs
    .find((p) => p.id === "esc")!
    .sessions.flatMap((s) => s.homework)
    .some((h) => h.id === "esc-5-c" && isHomeworkDone(h));
  const danaRow: CohortMember = {
    founderId: CURRENT_FOUNDER_ID,
    stepsDone: steps.done,
    stepsTotal: steps.total,
    mentorMeetingsHeld: seed.mentorMeetings.filter((m) => m.status === "held").length,
    halfway: halfwayDone ? "on_track" : "not_started",
    checkin: state.checkinConfirmed ? "confirmed" : "pending",
    activeWeeks: weekActivity(state.conversations.map((c) => c.occurredAt), TODAY, COHORT_WEEKS),
  };
  return [danaRow, ...listCohortMembers()].map((row) => {
    const f = getFounder(row.founderId)!;
    return { ...row, name: f.name, venture: f.ventureName, lastActivity: f.lastActivity };
  });
}

export function checkinResponse(rows: CohortMember[]) {
  const responded = rows.filter((r) => r.checkin !== "pending").length;
  const verified = rows.filter((r) => r.checkin === "verified").length;
  return { responded, verified, total: rows.length };
}

export function cohortStats(rows: CohortRow[]) {
  return {
    stepsTotal: rows[0]?.stepsTotal ?? 0,
    avgDonePct: Math.round((rows.reduce((n, r) => n + r.stepsDone / r.stepsTotal, 0) / rows.length) * 100),
    needNudge: rows.filter((r) => engagementStatus(r.lastActivity, TODAY) !== "active").length,
  };
}

export function phaseCounts(): Record<Phase, number> {
  const counts = Object.fromEntries(PHASES.map((p) => [p.key, 0])) as Record<Phase, number>;
  for (const f of listFounders()) counts[f.phase]++;
  return counts;
}

export function engagementCounts() {
  const counts = { active: 0, stalled: 0, quiet: 0 };
  for (const f of listFounders()) counts[engagementStatus(f.lastActivity, TODAY)]++;
  return counts;
}

/**
 * Outcome totals over founders who have confirmed a check-in, with the denominator.
 * Dana's entry comes from the confirmed Reported fields, corrections included.
 */
export function outcomeRollup(state: LiveState) {
  const outcomes = { ...getFounderOutcomes() };
  if (state.checkinConfirmed) {
    const fields = reportedWithEdits(state.reportedEdits);
    const num = (key: string) => fields.find((f) => f.key === key)?.numeric ?? 0;
    outcomes[CURRENT_FOUNDER_ID] = {
      payingCustomers: num("customers"),
      capitalRaised: num("capital"),
      jobs: num("jobs"),
      verified: fields.every((f) => f.numeric === undefined || f.verification === "document_verified"),
    };
  }
  const values = Object.values(outcomes);
  return {
    responded: values.length,
    verified: values.filter((o) => o.verified).length,
    total: listFounders().length,
    payingCustomers: values.reduce((n, o) => n + o.payingCustomers, 0),
    withPayingCustomers: values.filter((o) => o.payingCustomers > 0).length,
    capitalRaised: values.reduce((n, o) => n + o.capitalRaised, 0),
    jobs: values.reduce((n, o) => n + o.jobs, 0),
  };
}

export function capitalPipeline(state: LiveState): CapitalIntro[] {
  const danaIntros: CapitalIntro[] = state.optIns.map((partnerId) => ({
    id: `ci-dana-${partnerId}`,
    founderId: CURRENT_FOUNDER_ID,
    partnerId,
    stage: "opted_in",
    updatedAt: TODAY,
  }));
  return [...danaIntros, ...seed.capitalIntros];
}

export function pipelineStats(pipeline: CapitalIntro[]) {
  return {
    introsMade: pipeline.filter((i) => ["made", "meeting", "invested", "passed"].includes(i.stage)).length,
    invested: pipeline.filter((i) => i.stage === "invested").length,
    optedIn: pipeline.filter((i) => i.stage === "opted_in").length,
  };
}

/** A minimal three-layer record for fixture founders (no private content is seeded for them). */
export function fixtureRecord(founderId: string): FounderRecord | undefined {
  const founder = getFounder(founderId);
  if (!founder) return undefined;
  const row = listCohortMembers().find((r) => r.founderId === founderId);
  const o = getFounderOutcomes()[founderId];
  return {
    founder,
    conversations: [],
    contacts: [],
    notes: [],
    finances: [],
    programProgress: { programId: "esc", stepsDone: row?.stepsDone ?? 0, stepsTotal: row?.stepsTotal ?? 0 },
    mentorMeetings: [],
    reported: o
      ? [
          { key: "customers", label: "Paying customers", value: String(o.payingCustomers), source: "Check-in", verification: "self_reported" },
          { key: "capital", label: "Capital raised", value: `$${o.capitalRaised.toLocaleString()}`, source: "Check-in", verification: "self_reported" },
          { key: "jobs", label: "Jobs", value: String(o.jobs), source: "Check-in", verification: "self_reported" },
        ]
      : [],
  };
}
