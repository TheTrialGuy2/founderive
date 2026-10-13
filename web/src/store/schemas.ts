import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");

export const founderSchema = z.looseObject({
  name: z.string().default(""),
  venture: z.string().default(""),
  programTitle: z.string().default("Founder Program"),
  programStart: isoDate.nullish(),
  programWeeks: z.number().int().min(1).max(52).default(10),
  currentWeek: z.number().int().min(1).nullish(),
  today: isoDate.nullish(),
});

const exerciseSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  savesTo: z.string().nullish(),
});

const homeworkSchema = z
  .looseObject({
    id: z.string(),
    title: z.string(),
    due: isoDate.nullish(),
    status: z.enum(["open", "done", "skipped"]).default("open"),
    skipReason: z.string().nullish(),
    savesTo: z.string().nullish(),
  })
  .refine((h) => h.status !== "skipped" || !!h.skipReason, { message: "skipped homework needs a skipReason", path: ["skipReason"] });

export const weekSchema = z.looseObject({
  week: z.number().int().min(1),
  title: z.string(),
  date: isoDate.nullish(),
  status: z.enum(["not-started", "in-progress", "done"]).default("not-started"),
  exercises: z.array(exerciseSchema).default([]),
  homework: z.array(homeworkSchema).default([]),
});

/** Every file kind in founder-data: where it lives and what shape it must have. Later steps add kinds here. */
export const KINDS = {
  founder: { pattern: /^founder\.md$/, schema: founderSchema },
  week: { pattern: /^program\/week-\d{2}\.md$/, schema: weekSchema },
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
