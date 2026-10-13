import { weekFile } from "../core/program";
import { initData } from "../store/init";
import { readEntry } from "../store/read";
import { BUSINESS_MODELS, COFOUNDERS, COMMITMENTS, EVIDENCE_LEVELS, STAGES, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";
import { saveEntry } from "../store/write";

export type FounderData = KindData<"founder">;
export type StepPatch = Partial<FounderData>;
export type StepParse =
  | { ok: true; patch: StepPatch; values: Record<string, string> }
  | { ok: false; errors: Record<string, string>; values: Record<string, string> };

/** The four guided setup steps, in order. Each saves on its own, so a founder can stop and resume. */
export const SETUP_STEPS = [
  { n: 1, title: "You", fields: ["name", "city", "region", "commitment", "cofounders"] },
  { n: 2, title: "Your venture", fields: ["venture", "oneLiner", "stillWorking", "website", "industry", "businessModel", "startedOn"] },
  { n: 3, title: "Where you are", fields: ["stage", "evidence"] },
  { n: 4, title: "Customer, goal and time", fields: ["targetCustomer", "problem", "outcome30", "hoursPerWeek", "inProgram", "programTitle", "programStart", "programWeeks"] },
] as const;
export const LAST_STEP = SETUP_STEPS.length;

const oneOf = (list: readonly string[], v: string) => list.includes(v);

export function parseSetupStep(step: number, fd: FormData): StepParse {
  const spec = SETUP_STEPS.find((s) => s.n === step);
  if (!spec) return { ok: false, errors: { step: "Unknown setup step." }, values: {} };
  const values: Record<string, string> = {};
  for (const k of spec.fields) {
    const v = fd.get(k);
    values[k] = typeof v === "string" ? v.trim() : "";
  }
  const errors: Record<string, string> = {};
  const need = (k: string, message: string) => {
    if (!values[k]) errors[k] = message;
  };
  let patch: StepPatch = {};

  if (step === 1) {
    need("name", "Add your name.");
    need("city", "Add your city.");
    need("region", "Add your state or province.");
    if (!oneOf(COMMITMENTS, values.commitment)) errors.commitment = "Pick how much time you're giving it.";
    if (!oneOf(COFOUNDERS, values.cofounders)) errors.cofounders = "Pick how many founders there are.";
    patch = { name: values.name, city: values.city, region: values.region, commitment: values.commitment as FounderData["commitment"], cofounders: values.cofounders as FounderData["cofounders"] };
  }
  if (step === 2) {
    need("venture", "Add your venture's name. A working name is fine.");
    if (!values.stillWorking) need("oneLiner", "Describe it in one sentence, or tick “Still working on it”.");
    need("industry", "Add your industry, in your own words.");
    if (!oneOf(BUSINESS_MODELS, values.businessModel)) errors.businessModel = "Pick the closest business type.";
    if (!/^\d{4}-\d{2}$/.test(values.startedOn)) errors.startedOn = "Pick the month you started.";
    patch = {
      venture: values.venture,
      oneLiner: values.stillWorking ? null : values.oneLiner,
      website: values.website || null,
      industry: values.industry,
      businessModel: values.businessModel as FounderData["businessModel"],
      startedOn: values.startedOn,
    };
  }
  if (step === 3) {
    if (!oneOf(STAGES, values.stage)) errors.stage = "Pick the stage closest to where you are.";
    if (!oneOf(EVIDENCE_LEVELS, values.evidence)) errors.evidence = "Pick the strongest evidence you have so far.";
    patch = { stage: values.stage as FounderData["stage"], evidence: values.evidence as FounderData["evidence"] };
  }
  if (step === 4) {
    need("problem", "Say the problem in one sentence.");
    need("outcome30", "Say what you want to be true in 30 days.");
    const hours = Number(values.hoursPerWeek);
    if (!values.hoursPerWeek || !Number.isFinite(hours) || hours < 0 || hours > 168) errors.hoursPerWeek = "Enter hours per week between 0 and 168.";
    patch = { targetCustomer: values.targetCustomer || null, problem: values.problem, outcome30: values.outcome30, hoursPerWeek: hours, programTitle: null, programStart: null, programWeeks: null };
    if (values.inProgram) {
      need("programTitle", "Add the program's name.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(values.programStart)) errors.programStart = "Add the program's start date.";
      const weeks = Number(values.programWeeks);
      if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) errors.programWeeks = "Enter the number of weeks (1–52).";
      else patch = { ...patch, programTitle: values.programTitle, programStart: values.programStart, programWeeks: weeks };
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, values };
  return { ok: true, patch, values };
}

/** Where a founder should resume setup, or null once it's complete. */
export function firstIncompleteStep(f: FounderData | null): number | null {
  if (!f) return 1;
  if (f.setupComplete) return null;
  if (!f.name || !f.city || !f.region || !f.commitment || !f.cofounders) return 1;
  if (!f.venture || !f.industry || !f.businessModel || !f.startedOn) return 2;
  if (!f.stage || !f.evidence) return 3;
  return 4;
}

/** Saves one setup step. The first save creates founder-data; the last marks setup complete and creates blank program weeks (never overwriting). */
export async function saveSetupStep(step: number, patch: StepPatch): Promise<void> {
  await initData();
  const { data } = await updateEntry("founder", "founder.md", (existing, body) => {
    const previous: FounderData = existing ?? { name: "", venture: "", setupComplete: false };
    return { data: { ...previous, ...patch, setupComplete: previous.setupComplete || step === LAST_STEP }, body };
  });

  if (step === LAST_STEP && data.programTitle && data.programWeeks) {
    for (let n = 1; n <= data.programWeeks; n++) {
      if (await readEntry("week", weekFile(n))) continue;
      await saveEntry("week", weekFile(n), { week: n, title: `Week ${n}`, status: "not-started", exercises: [], homework: [] });
    }
  }
}
