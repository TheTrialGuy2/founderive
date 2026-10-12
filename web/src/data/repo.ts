// The only module pages read seed data from. Today it returns fixtures; later each
// function becomes a Supabase query with the same signature (made async).
import { CURRENT_COHORT_ID, CURRENT_FOUNDER_ID } from "@/config";
import { cohortMembers, founderOutcomes, founders } from "@/data/fixtures/founders";
import { artifacts, programs } from "@/data/fixtures/programs";
import * as record from "@/data/fixtures/record";
import type { Founder, Phase, Program, Session } from "@/data/types";

export const PHASES: { key: Phase; label: string; blurb: string; outcome: string; evidence: string[] }[] = [
  {
    key: "idea",
    label: "Idea",
    blurb: "Is this a real problem worth solving?",
    outcome: "A real problem, a specific customer",
    evidence: ["15 customer conversations", "Riskiest assumption named"],
  },
  {
    key: "early",
    label: "Early building",
    blurb: "Turn the idea into a tested business model.",
    outcome: "A business model you've tested",
    evidence: ["Pricing tested with 5 customers", "Milestones on track at halfway"],
  },
  {
    key: "validation",
    label: "Validation & traction",
    blurb: "Prove customers will pay and keep paying.",
    outcome: "Customers pay and come back",
    evidence: ["3 paying pilots", "Weekly repeat use"],
  },
  {
    key: "capital",
    label: "Capital",
    blurb: "Raise the right money from the right partners.",
    outcome: "The right money for your model",
    evidence: ["Readiness profile shared", "Introductions made"],
  },
];

export const phaseLabel = (phase: Phase) => PHASES.find((p) => p.key === phase)?.label ?? phase;

export function getFounder(id: string): Founder | undefined {
  return founders.find((f) => f.id === id);
}

export function getCurrentFounder(): Founder {
  return getFounder(CURRENT_FOUNDER_ID)!;
}

export function listFounders(): Founder[] {
  return founders;
}

export function listPrograms(): Program[] {
  return programs;
}

export function getProgram(id: string): Program | undefined {
  return programs.find((p) => p.id === id);
}

export function getSession(programId: string, n: number): Session | undefined {
  return getProgram(programId)?.sessions.find((s) => s.n === n);
}

export function artifactLabel(id: string): string | undefined {
  return artifacts[id];
}

export function listCohortMembers() {
  return cohortMembers;
}

export function getCohortName(cohortId: string) {
  return cohortId === CURRENT_COHORT_ID ? "Early-Stage Cohort · Fall 2026" : cohortId;
}

export function getFounderOutcomes() {
  return founderOutcomes;
}

export const seed = {
  conversations: record.conversations,
  outcomes: record.outcomes,
  metrics: record.metrics,
  observations: record.observations,
  milestones: record.milestones,
  mentors: record.mentors,
  mentorMeetings: record.mentorMeetings,
  readinessCriteria: record.readinessCriteria,
  capitalPartners: record.capitalPartners,
  capitalIntros: record.capitalIntros,
  reportedFields: record.reportedFields,
  privateNotes: record.privateNotes,
};
