import { z } from "zod";
import { isoWeekId } from "../core/week";

/** True when YYYY-MM-DD names a real calendar day (so 2026-02-30 and 2026-13-45 are rejected). */
function isCalendarDate(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** True for YYYY-Www with a week this ISO year actually has (W53 only in long years). */
function isRealIsoWeek(s: string): boolean {
  const year = s.slice(0, 4);
  const week = Number(s.slice(6));
  if (week < 1 || week > 53) return false;
  return week < 53 || isoWeekId(`${year}-12-28`) === `${year}-W53`;
}

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD").refine(isCalendarDate, "not a real date");

// Metadata any record may carry. Any other custom data belongs under `extensions`, so typos in core fields are caught.
const meta = {
  seeded: z.boolean().optional(),
  source: z.string().nullish(),
  concepts: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
};

export const STAGES = ["idea", "validating", "pre-revenue", "revenue"] as const;
export const BUSINESS_MODELS = ["service", "local-business", "physical-product", "software", "marketplace", "nonprofit", "other"] as const;
export const EVIDENCE_LEVELS = ["none", "conversations", "active-users", "paying-customers", "repeat-customers"] as const;
export const COMMITMENTS = ["full-time", "part-time", "nights-weekends"] as const;
export const COFOUNDERS = ["solo", "two", "three-plus"] as const;
export type Stage = (typeof STAGES)[number];
export type BusinessModel = (typeof BUSINESS_MODELS)[number];
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export type Commitment = (typeof COMMITMENTS)[number];
export type Cofounders = (typeof COFOUNDERS)[number];

export const CANVAS_STATUSES = ["untested", "some-evidence", "tested"] as const;
export type CanvasStatus = (typeof CANVAS_STATUSES)[number];

export const founderSchema = z.strictObject({
  ...meta,
  name: z.string().default(""),
  venture: z.string().default(""),
  city: z.string().nullish(),
  region: z.string().nullish(), // two-letter US state code (setup offers US states only for now)
  commitment: z.enum(COMMITMENTS).nullish(),
  cofounders: z.enum(COFOUNDERS).nullish(),
  cofounderNames: z.array(z.string().min(1)).optional(),
  website: z.string().nullish(),
  industry: z.string().nullish(),
  startedOn: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use YYYY-MM").nullish(),
  problem: z.string().nullish(),
  oneLiner: z.string().nullish(), // null means "still working on it"
  stage: z.enum(STAGES).nullish(),
  businessModel: z.enum(BUSINESS_MODELS).nullish(),
  targetCustomer: z.string().nullish(),
  evidence: z.enum(EVIDENCE_LEVELS).nullish(),
  outcome30: z.string().nullish(),
  hoursPerWeek: z.number().min(0).max(168).nullish(),
  setupComplete: z.boolean().default(false),
  // A program is optional: all three are set together, or none.
  programTitle: z.string().nullish(),
  programStart: isoDate.nullish(),
  programWeeks: z.number().int().min(1).max(52).nullish(),
  currentWeek: z.number().int().min(1).nullish(),
  today: isoDate.nullish(),
});

const exerciseSchema = z.strictObject({
  ...meta,
  id: z.string(),
  title: z.string(),
  savesTo: z.string().nullish(),
});

const homeworkSchema = z
  .strictObject({
    ...meta,
    id: z.string(),
    title: z.string(),
    due: isoDate.nullish(),
    status: z.enum(["open", "done", "skipped"]).default("open"),
    skipReason: z.string().nullish(),
    savesTo: z.string().nullish(),
  })
  .refine((h) => h.status !== "skipped" || !!h.skipReason, { message: "skipped homework needs a skipReason", path: ["skipReason"] });

export const weekSchema = z.strictObject({
  ...meta,
  week: z.number().int().min(1),
  title: z.string(),
  date: isoDate.nullish(),
  status: z.enum(["not-started", "in-progress", "done"]).default("not-started"),
  exercises: z.array(exerciseSchema).default([]),
  homework: z.array(homeworkSchema).default([]),
});

const commitmentSchema = z
  .strictObject({
    id: z.string(),
    text: z.string().min(1),
    due: isoDate.nullish(),
    status: z.enum(["open", "done", "dropped"]).default("open"),
    reason: z.string().nullish(),
    link: z.string().nullish(), // a founder-data path, or "guide:<step id>"
  })
  .refine((c) => c.status !== "dropped" || !!c.reason, { message: "dropped commitments need a reason", path: ["reason"] });

const nextStepChoiceSchema = z.strictObject({
  date: isoDate,
  actionId: z.string(),
  label: z.string(),
  choice: z.enum(["dismissed", "deferred", "replaced"]),
  reason: z.string().min(1),
  until: isoDate.nullish(),
  replacement: z.string().nullish(),
});

export const checkinSchema = z.strictObject({
  ...meta,
  week: z.string().regex(/^\d{4}-W\d{2}$/, "use YYYY-Www").refine(isRealIsoWeek, "that year has no such week"),
  outcome: z.string().nullish(),
  commitments: z.array(commitmentSchema).default([]),
  blocker: z.string().nullish(),
  helpNeeded: z.string().nullish(),
  nextStepLog: z.array(nextStepChoiceSchema).default([]),
});

const blockId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "use lowercase letters, digits and hyphens");

/** canvas/blocks.md: the founder's own list of canvas blocks. Without it, the shipped generic list is used. */
export const canvasConfigSchema = z
  .strictObject({
    ...meta,
    blocks: z
      .array(
        z.strictObject({
          id: blockId.refine((id) => id !== "blocks", '"blocks" is reserved for this file'),
          title: z.string().min(1),
          prompt: z.string().min(1),
        }),
      )
      .min(1, "list at least one block"),
  })
  .refine((c) => new Set(c.blocks.map((b) => b.id)).size === c.blocks.length, { message: "each block id must be unique", path: ["blocks"] });

/** canvas/<id>.md: one current belief. Changed wording is kept in history, never lost. */
export const canvasBlockSchema = z.strictObject({
  ...meta,
  id: blockId,
  title: z.string().nullish(),
  text: z.string().default(""),
  status: z.enum(CANVAS_STATUSES).default("untested"),
  updated: isoDate.nullish(),
  history: z.array(z.strictObject({ date: isoDate, text: z.string() })).default([]),
});

/** Every file kind in founder-data: where it lives and what shape it must have. Later steps add kinds here. */
export const KINDS = {
  founder: { pattern: /^founder\.md$/, schema: founderSchema },
  week: { pattern: /^program\/week-\d{2}\.md$/, schema: weekSchema },
  checkin: { pattern: /^checkins\/\d{4}-W\d{2}\.md$/, schema: checkinSchema },
  canvasConfig: { pattern: /^canvas\/blocks\.md$/, schema: canvasConfigSchema },
  canvasBlock: { pattern: /^canvas\/(?!blocks\.md$)[a-z0-9]+(?:-[a-z0-9]+)*\.md$/, schema: canvasBlockSchema },
} as const;

export type Kind = keyof typeof KINDS;
export type KindData<K extends Kind> = z.infer<(typeof KINDS)[K]["schema"]>;

export function kindOf(rel: string): Kind | null {
  for (const kind of Object.keys(KINDS) as Kind[]) if (KINDS[kind].pattern.test(rel)) return kind;
  return null;
}

export function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(file)"}: ${i.message}`).join("; ");
}
