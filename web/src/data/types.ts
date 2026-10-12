// Entity shapes for the wireframe. They mirror the future Postgres schema so the
// fixture data source can be swapped for Supabase without touching pages.

/** Who can see a piece of the record. */
export type Layer = "private" | "program" | "reported";

export type Phase = "idea" | "early" | "validation" | "capital";
export type VentureType = "growth" | "main_street" | "unsure";
export type Relationship = "cold" | "warm" | "referred" | "friend" | "family";

export interface ProfileAnswer {
  key: string;
  question: string;
  answer: string;
  layer: Exclude<Layer, "reported">;
}

export type FounderBasics = Pick<Founder, "name" | "ventureName" | "oneLiner" | "city" | "phase" | "ventureType">;

export interface Founder {
  id: string;
  name: string;
  ventureName: string;
  oneLiner: string;
  city: string;
  phase: Phase;
  ventureType: VentureType;
  cohortId: string | null;
  programIds: string[];
  completedProgramIds: string[];
  lastActivity: string;
  focusQuestion: string;
  profile: ProfileAnswer[];
}

export interface Material {
  title: string;
  kind: "slides" | "worksheet" | "reading" | "recording";
}

export interface HomeworkItem {
  id: string;
  title: string;
  dueAt: string;
  /** The part of the company record this homework produces. */
  builds: string;
  required: number;
  evidenceIds: string[];
  /** Skipped with a reason; doesn't count as done, but stops nagging. */
  skippedReason?: string;
}

export interface Session {
  n: number;
  title: string;
  date: string;
  materials: Material[];
  homework: HomeworkItem[];
  facilitatorNote: string;
}

export interface Program {
  id: string;
  name: string;
  phase: Phase;
  format: string;
  description: string;
  unlocks: string;
  sessions: Session[];
}

export type ConversationType =
  | "customer_discovery"
  | "mentor"
  | "investor"
  | "peer"
  | "expert";

export interface FollowUp {
  id: string;
  title: string;
  owner: "founder" | "other";
  who: string;
  dueAt: string;
  status: "open" | "done";
}

export interface Conversation {
  id: string;
  founderId: string;
  type: ConversationType;
  with: string;
  org: string;
  relationship: Relationship;
  occurredAt: string;
  newFact: string;
  whatThisChanges: string[];
  quotes: string[];
  numbers: { label: string; value: string }[];
  contaminationFlags: string[];
  followUps: FollowUp[];
}

export interface Outcome {
  id: string;
  title: string;
  why: string;
}

export interface CountingRule {
  type: ConversationType;
  excludeRelationships: Relationship[];
}

export interface Metric {
  id: string;
  outcomeId: string;
  name: string;
  definition: string;
  unit: string;
  /** Count metrics are computed from conversations; latest metrics from observations. */
  kind: "count" | "latest";
  countingRule?: CountingRule;
  baseline: number;
  baselineAt: string;
  target: number;
  targetAt: string;
}

export interface Observation {
  id: string;
  metricId: string;
  value: number;
  observedAt: string;
  source: string;
  retractedReason?: string;
}

export interface Milestone {
  id: string;
  title: string;
  halfwayCheck: string;
  status: "on_track" | "behind" | "done";
  dueAt: string;
}

export interface Mentor {
  name: string;
  role: string;
  domain: string;
}

export interface MentorMeeting {
  id: string;
  date: string;
  status: "upcoming" | "held";
  writeup?: { said: string[]; homework: string[]; changes: string[] };
}

export interface ReadinessCriterion {
  key: string;
  name: string;
  question: string;
  required: number;
  evidence: string[];
}

export interface CapitalPartner {
  id: string;
  name: string;
  kind: "angel_fund" | "pitch_event" | "grant";
  checkSize: string;
  fit: string;
  /** Reviewer criteria that must be supported before a founder can share with this partner. */
  minSupported: number;
}

export type IntroStage = "opted_in" | "requested" | "made" | "meeting" | "invested" | "passed";

export interface CapitalIntro {
  id: string;
  founderId: string;
  partnerId: string;
  stage: IntroStage;
  updatedAt: string;
}

export interface ReportedField {
  key: string;
  label: string;
  value: string;
  source: string;
  verification: "self_reported" | "document_verified";
  /** Typed value for fields that roll up across founders (customers, capital, jobs). */
  numeric?: number;
}

/** A founder as an operator sees them in a cohort table. */
export interface CohortMember {
  founderId: string;
  stepsDone: number;
  stepsTotal: number;
  mentorMeetingsHeld: number;
  halfway: "on_track" | "behind" | "not_started";
  checkin: "confirmed" | "verified" | "pending";
  /** Activity per cohort week, most recent first. */
  activeWeeks: boolean[];
}

/** Everything about one founder, across all three layers. */
export interface FounderRecord {
  founder: Founder;
  conversations: Conversation[];
  contacts: string[];
  notes: string[];
  finances: { label: string; value: string }[];
  programProgress: { programId: string; stepsDone: number; stepsTotal: number };
  mentorMeetings: MentorMeeting[];
  reported: ReportedField[];
}

/** What an operator may see: no Private layer at all. */
export interface OperatorFounderView {
  founder: Pick<Founder, "id" | "name" | "ventureName" | "oneLiner" | "city" | "phase" | "ventureType" | "lastActivity">;
  profile: ProfileAnswer[];
  programProgress: FounderRecord["programProgress"];
  mentorMeetings: { id: string; date: string; status: MentorMeeting["status"] }[];
  reported: ReportedField[];
  lockedSections: string[];
}
