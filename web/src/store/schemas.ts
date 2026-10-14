import { z } from "zod";
import { CONTACT_DETAILS_MESSAGE, looksLikeContactDetails } from "../core/privacy";
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

export const BLOCK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const blockId = z.string().regex(BLOCK_ID_PATTERN, "use lowercase letters, digits and hyphens");

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

export const AREAS = ["customer", "problem", "solution", "channel", "revenue", "cost", "feasibility"] as const;
export const CONVERSATION_TYPES = ["customer", "prospect", "mentor", "partner", "investor", "other"] as const;
export const TEST_STATUSES = ["planned", "running", "complete", "abandoned"] as const;
export const TEST_RESULTS = ["supported", "contradicted", "inconclusive"] as const;
export const TEST_DECISIONS = ["continue", "revise", "pause", "stop"] as const;
export const EVIDENCE_STRENGTHS = ["none", "weak", "moderate", "strong"] as const;
export type Area = (typeof AREAS)[number];
export type ConversationType = (typeof CONVERSATION_TYPES)[number];
export type TestStatus = (typeof TEST_STATUSES)[number];
export type TestResult = (typeof TEST_RESULTS)[number];
export type TestDecision = (typeof TEST_DECISIONS)[number];
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

/** Conversations with people who might buy are customer evidence; the other types are advice (amendment §5.3). */
export const CUSTOMER_TYPES: readonly ConversationType[] = ["customer", "prospect"];

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
  logo: z.string().regex(/^brand\/logo\.(png|jpg|webp)$/).nullish(),
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
  weeklyTalkGoal: z.number().int().min(1).max(50).nullish(), // people to talk to each week; Home uses 3 when absent
  setupComplete: z.boolean().default(false),
  bringWhatYouHave: z.enum(["imported", "dismissed"]).nullish(), // hides Today's "Bring what you have" card
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
    link: z.string().nullish(), // a founder-data path, "guide:<step id>", or "step:<canvas block id>" (a planned conversation)
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
  via: z.enum(["app", "agent"]).optional(), // who wrote the entry; the founder gave the reason either way
});

export const checkinSchema = z.strictObject({
  ...meta,
  week: z.string().regex(/^\d{4}-W\d{2}$/, "use YYYY-Www").refine(isRealIsoWeek, "that year has no such week"),
  outcome: z.string().nullish(),
  commitments: z.array(commitmentSchema).default([]),
  blocker: z.string().nullish(),
  helpNeeded: z.string().nullish(),
  nextStepLog: z.array(nextStepChoiceSchema).default([]),
  appliedUpdates: z.array(z.string()).optional(), // ids of weekly updates pasted from a browser chat, so one is never applied twice
  talkGoal: z.number().int().min(1).max(50).nullish(), // this week's people-talked-to goal; overrides founder.weeklyTalkGoal
  outreach: z.strictObject({ reached: z.number().int().min(0), replied: z.number().int().min(0) }).nullish(), // effort, never the headline
  focus: blockId.nullish(), // the step the founder chose to deepen this week once every step is done
});

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
  done: isoDate.nullish(), // the founder marked this path step done; Reopen clears it
  doneReason: z.string().nullish(), // their optional "ready to move on because…"
});

// Links are founder-data paths. They aren't validated here: a broken link is a warning from check-data and a note on
// the record's page, never a reason to drop the record (amendment §13).
const links = z.array(z.string().min(1)).default([]);

/**
 * `<dir>/YYYY-MM-DD-<slug>.md`: a real calendar date (so 2026-99-99 is refused) and a lowercase slug of letters,
 * digits and single hyphens. It has the same `test()` as a RegExp, so the rest of the store uses it unchanged.
 */
const datedFile = (dir: string) => {
  const re = new RegExp(`^${dir}/(\\d{4}-\\d{2}-\\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\\.md$`);
  return {
    test: (rel: string) => {
      const m = re.exec(rel);
      return !!m && isCalendarDate(m[1]);
    },
  };
};

const followUpSchema = z.strictObject({
  id: z.string(),
  text: z.string().min(1),
  due: isoDate.nullish(),
  status: z.enum(["open", "done"]).default("open"),
});

/** A conversation (amendment §5.3). The body holds the notes. */
export const conversationSchema = z
  .strictObject({
    ...meta,
    type: z.enum(CONVERSATION_TYPES),
    // A first name or a role. Contact details never go in a record, whichever path wrote it (hand edits included).
    person: z
      .string()
      .min(1)
      .refine((v) => !looksLikeContactDetails(v), CONTACT_DETAILS_MESSAGE),
    org: z.string().nullish(),
    date: isoDate.nullish(), // unknown when imported from a chat that didn't say when
    segment: z.string().nullish(),
    context: z.string().nullish(),
    questionsAsked: z.string().nullish(),
    observedBehavior: z.string().nullish(),
    quotes: z.array(z.string().min(1)).default([]),
    numbers: z.array(z.string().min(1)).default([]),
    alternatives: z.string().nullish(),
    urgency: z.string().nullish(),
    buyingProcess: z.string().nullish(),
    followUps: z.array(followUpSchema).default([]),
    relatedTests: links,
    areas: z.array(blockId).default([]), // canvas block ids (path steps); the seven shipped areas are block ids too
    whatChanges: z.string().nullish(),
    whatChangesConfirmed: z.boolean().default(false),
  })
  .refine((c) => !c.whatChangesConfirmed || !!c.whatChanges?.trim(), { message: "say what changes before confirming it", path: ["whatChangesConfirmed"] });

/** A venture test (amendment §5.4) with the adopted split: `result` is what the evidence showed, `decision` is what the founder chose. */
export const testSchema = z
  .strictObject({
    ...meta,
    title: z.string().min(1),
    area: blockId, // the canvas block (path step) this tests
    status: z.enum(TEST_STATUSES).default("planned"),
    belief: z.string().min(1),
    risk: z.string().nullish(),
    test: z.string().min(1),
    successCriteria: z.string().min(1),
    failureCriteria: z.string().min(1),
    due: isoDate.nullish(),
    startedOn: isoDate.nullish(),
    closedOn: isoDate.nullish(),
    relatedConversations: links,
    relatedFiles: links,
    evidenceStrength: z.enum(EVIDENCE_STRENGTHS).default("none"),
    result: z.enum(TEST_RESULTS).nullish(),
    decision: z.enum(TEST_DECISIONS).nullish(),
    nextCommitment: z.string().nullish(),
    nextCommitmentDue: isoDate.nullish(),
    abandonReason: z.string().nullish(),
  })
  .superRefine((t, ctx) => {
    const complete = t.status === "complete";
    if (complete && !t.result) ctx.addIssue({ code: "custom", path: ["result"], message: "a complete test needs a result" });
    if (complete && !t.decision) ctx.addIssue({ code: "custom", path: ["decision"], message: "a complete test needs a decision" });
    if (!complete && t.result) ctx.addIssue({ code: "custom", path: ["result"], message: "only a complete test has a result" });
    if (!complete && t.decision) ctx.addIssue({ code: "custom", path: ["decision"], message: "only a complete test has a decision" });
    if (t.status === "abandoned" && !t.abandonReason?.trim()) ctx.addIssue({ code: "custom", path: ["abandonReason"], message: "say why the test was stopped" });
  });

/** A decision made outside a venture test (spec §0, decision log). A test's own decision stays on the test. */
export const decisionSchema = z.strictObject({
  ...meta,
  title: z.string().min(1),
  date: isoDate,
  area: z.enum(AREAS).nullish(),
  beliefBefore: z.string().nullish(),
  evidence: links,
  alternatives: z.array(z.string().min(1)).default([]),
  decision: z.string().min(1),
  why: z.string().min(1),
  reversible: z.boolean(),
  relatedTest: z.string().nullish(),
});

/** A beta tester's feedback, kept locally. It holds only what they typed, the page and the app version. */
export const feedbackSchema = z.strictObject({
  ...meta,
  date: isoDate,
  page: z.string().nullish(),
  whatHappened: z.string().min(1),
  expected: z.string().nullish(),
  appVersion: z.string(),
});

/** Every file kind in founder-data: where it lives and what shape it must have. Later steps add kinds here. */
export const KINDS = {
  founder: { pattern: /^founder\.md$/, schema: founderSchema },
  week: { pattern: /^program\/week-\d{2}\.md$/, schema: weekSchema },
  checkin: { pattern: /^checkins\/\d{4}-W\d{2}\.md$/, schema: checkinSchema },
  canvasConfig: { pattern: /^canvas\/blocks\.md$/, schema: canvasConfigSchema },
  canvasBlock: { pattern: /^canvas\/(?!blocks\.md$)[a-z0-9]+(?:-[a-z0-9]+)*\.md$/, schema: canvasBlockSchema },
  conversation: { pattern: datedFile("conversations"), schema: conversationSchema },
  test: { pattern: datedFile("tests"), schema: testSchema },
  decision: { pattern: datedFile("decisions"), schema: decisionSchema },
  feedback: { pattern: datedFile("feedback"), schema: feedbackSchema },
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
