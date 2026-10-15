import { createHash } from "node:crypto";
import { listEntries, readEntry } from "../store/read";
import { kindOf, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";
import { confirmImported, importCanvasBlock, loadCanvasDefs } from "./canvas";
import { isoWeekId } from "../core/week";
import { checkinPath } from "./checkin";
import { createConversation } from "./conversations";
import { applyWeekPlan, blockBody, FOUNDER_LABELS, parseImportBlock, parseWeekBlock, type FounderField } from "./paste-bridge";

export type ImportItem = { label: string; status: "created" | "skipped" | "failed"; path?: string; detail?: string };
export type ImportResult = { importId: string; items: ImportItem[]; assumptions: { belief: string; risk: string | null }[] };

/** A short, stable id for a pasted block, so running the same block again is recognized. */
export function importIdOf(text: string): string {
  return createHash("sha256").update(blockBody(text, "founderive-import").trim()).digest("hex").slice(0, 8);
}

/** True when `source` was written by this import, on whatever day it ran (so a retry the next day still matches). */
const fromImport = (source: string | null | undefined, importId: string) => !!source && source.startsWith("chat import ") && source.endsWith(` #${importId}`);

const conversationKey = (c: { person: string; type: string; date?: string | null }) => `${c.person}|${c.type}|${c.date ?? ""}`;

// Imports run one at a time in this process, so a double submit (or "Try again" pressed twice) can't create a draft twice.
let importQueue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const run = importQueue.then(work, work);
  importQueue = run.catch(() => undefined);
  return run;
}

/**
 * Writes a pasted import block as drafts marked seeded, never overwriting. Idempotent and resumable: every draft is
 * tagged `chat import <date> #<import id>`, and a draft already created with that import id is skipped, so a retry
 * after a failure creates only what's missing. Each draft succeeds or fails on its own and is reported. Nothing at
 * all is written while any line needs fixing. Assumptions are never written: they come back for "Turn this into a
 * test". `beforeDraft` is a test seam.
 */
export type ImportOptions = {
  /** The founder.md fields the founder left checked in the preview. Only these are written (and still only where empty). Omitted: all. */
  founderFields?: FounderField[];
  beforeDraft?: (index: number) => void;
};

export function createImportDrafts(text: string, today: string, options: ImportOptions = {}): Promise<ImportResult> {
  return oneAtATime(() => importDrafts(text, today, options));
}

async function importDrafts(text: string, today: string, hooks: ImportOptions): Promise<ImportResult> {
  const { defs } = await loadCanvasDefs();
  const { drafts, errors } = parseImportBlock(text, defs);
  if (errors.length > 0) throw new Error(`Nothing was created. Fix these lines first: ${errors.join(" ")}`);
  if (drafts.length === 0) throw new Error("There's nothing to import in that text. Paste the whole block your chat gave you.");
  const importId = importIdOf(text);
  const meta = { seeded: true, source: `chat import ${today} #${importId}` };
  const result: ImportResult = { importId, items: [], assumptions: [] };

  // Conversations this import already created, per person/type/date, so repeats are matched one to one.
  const done = new Map<string, string[]>();
  for (const e of await listEntries("conversation")) {
    if (e.ok && fromImport(e.data.source, importId)) done.set(conversationKey(e.data), [...(done.get(conversationKey(e.data)) ?? []), e.path]);
  }

  for (const [index, d] of drafts.entries()) {
    if (d.kind === "assumption") {
      result.assumptions.push({ belief: d.belief, risk: d.risk });
      continue;
    }
    const label = d.kind === "founder" ? "Founder details" : d.kind === "canvas" ? `Canvas · ${d.title}` : `Conversation: ${d.input.person}`;
    try {
      hooks.beforeDraft?.(index);
      if (d.kind === "founder") {
        const chosen = hooks.founderFields;
        const fields = chosen ? Object.fromEntries(Object.entries(d.fields).filter(([k]) => chosen.includes(k as FounderField))) : d.fields;
        result.items.push(Object.keys(fields).length === 0 ? { label, status: "skipped", detail: "Not chosen, so nothing was written." } : await fillFounder(fields, label));
      } else if (d.kind === "canvas") {
        const rel = `canvas/${d.id}.md`;
        const r = await importCanvasBlock(d.id, d.text, meta, today);
        if (r.status === "created") result.items.push({ label, status: "created", path: rel });
        else result.items.push({ label, status: "skipped", path: rel, detail: fromImport(r.source, importId) ? "Already imported." : "Already written, so yours was kept." });
      } else {
        const key = conversationKey(d.input);
        const already = done.get(key) ?? [];
        if (already.length > 0) {
          done.set(key, already.slice(1));
          result.items.push({ label, status: "skipped", path: already[0], detail: "Already imported." });
        } else {
          result.items.push({ label, status: "created", path: await createConversation({ ...d.input, whatChangesConfirmed: false }, meta, today) });
        }
      }
    } catch (error) {
      result.items.push({ label, status: "failed", detail: error instanceof Error ? error.message : "Couldn't create it." });
    }
  }

  // Something came in, so Today stops offering "Bring what you have".
  const founder = await readEntry("founder", "founder.md");
  if (founder?.ok && founder.data.bringWhatYouHave !== "imported" && result.items.some((x) => x.status === "created")) {
    await updateEntry("founder", "founder.md", (data, body) => {
      if (!data) throw new Error("Finish setup first.");
      return { data: { ...data, bringWhatYouHave: "imported" }, body };
    });
  }
  return result;
}

/** Fills founder.md fields that are empty now; a field with a value is never changed. founder.md isn't marked seeded. */
async function fillFounder(fields: Partial<Record<FounderField, string>>, label: string): Promise<ImportItem> {
  const founder = await readEntry("founder", "founder.md");
  if (!founder) return { label, status: "failed", detail: "Finish setup first." };
  if (!founder.ok) return { label, status: "failed", detail: `Fix founder-data/founder.md first: ${founder.error}` };
  const empty = (data: KindData<"founder">) => (Object.keys(fields) as FounderField[]).filter((k) => !data[k]?.trim());
  if (empty(founder.data).length === 0) return { label, status: "skipped", path: "founder.md", detail: "Already filled in, so yours were kept." };
  let filled: FounderField[] = [];
  await updateEntry("founder", "founder.md", (data, body) => {
    if (!data) throw new Error("founder.md isn't there anymore. Reload the page.");
    filled = empty(data);
    const next: KindData<"founder"> = { ...data };
    for (const k of filled) {
      const value = fields[k];
      if (value) next[k] = value;
    }
    return { data: next, body };
  });
  if (filled.length === 0) return { label, status: "skipped", path: "founder.md", detail: "Already filled in, so yours were kept." };
  return { label: `Founder details: ${filled.map((k) => FOUNDER_LABELS[k]).join(", ")}`, status: "created", path: "founder.md" };
}

/** "Not now" on Today's Bring what you have card. An earlier import stays recorded as one. */
export async function dismissBringWhatYouHave(): Promise<void> {
  await updateEntry("founder", "founder.md", (data, body) => {
    if (!data) throw new Error("Finish setup first.");
    return { data: { ...data, bringWhatYouHave: data.bringWhatYouHave ?? "dismissed" }, body };
  });
}

const CONFIRMABLE = ["conversation", "test", "decision", "canvasBlock", "week"] as const;
type Confirmable = (typeof CONFIRMABLE)[number];

/**
 * The founder accepts an imported draft as their own: the seeded mark goes; its source stays for the record. A record
 * that isn't marked imported is left untouched (not rewritten). Canvas blocks go through the canvas command.
 */
export async function confirmImportedRecord(rel: string): Promise<void> {
  const kind = kindOf(rel);
  if (!kind || !(CONFIRMABLE as readonly string[]).includes(kind)) throw new Error(`founder-data/${rel} can't be confirmed here.`);
  const k = kind as Confirmable;
  const entry = await readEntry(k, rel);
  if (!entry) throw new Error(`founder-data/${rel} isn't there anymore. Reload the page.`);
  if (!entry.ok) throw new Error(`Fix founder-data/${rel} first: ${entry.error}`);
  if (!entry.data.seeded) return;
  if (k === "canvasBlock") return confirmImported(rel.slice("canvas/".length, -".md".length));
  await updateEntry(k, rel, (data, body) => {
    if (!data) throw new Error(`founder-data/${rel} isn't there anymore. Reload the page.`);
    const next = { ...data } as KindData<Confirmable> & { seeded?: boolean };
    delete next.seeded;
    return { data: next as KindData<typeof k>, body };
  });
}

/** The id of a pasted weekly update: a hash of its block's lines, trimmed, without blank lines or the text around the fence. */
export function weekUpdateIdOf(text: string): string {
  const lines = blockBody(text, "founderive-week")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 12);
}

export type WeekUpdateResult = { status: "applied" } | { status: "already-applied"; message: string };
export const ALREADY_APPLIED = "This update was already applied.";

class AlreadyApplied extends Error {}

/**
 * Applies a pasted founderive-week block, once. The page's week must be this week (recomputed here from `today`).
 * Inside one updateEntry callback the update's id is checked against the ids already applied (so a replay or a
 * double submit changes nothing), the plan is re-checked against this week's open commitments, and every change is
 * made, so the check-in is written once with all of them or not at all. Any parse error, or an open commitment with
 * no kept, done or dropped line, means nothing is written. New commitments get ids from the update's id and their
 * line's ordinal. `afterChange` is a test seam.
 */
export async function applyWeekUpdate(weekId: string, text: string, today: string, hooks: { afterChange?: () => void } = {}): Promise<WeekUpdateResult> {
  if (weekId !== isoWeekId(today)) throw new Error("This page is from last week. Reload and paste again.");
  const op = weekUpdateIdOf(text);
  try {
    await updateEntry("checkin", checkinPath(weekId), (data, body) => {
      if (data?.appliedUpdates?.includes(op)) throw new AlreadyApplied(ALREADY_APPLIED);
      const c: KindData<"checkin"> = data ? structuredClone(data) : { week: weekId, commitments: [], nextStepLog: [] };
      const plan = parseWeekBlock(text, c.commitments.filter((x) => x.status === "open" && !x.repeat));
      if (plan.errors.length > 0) throw new Error(`Nothing was changed. Fix these lines first: ${plan.errors.join(" ")}`);
      if (plan.notReviewed.length > 0)
        throw new Error(`Nothing was changed. Every open commitment needs a kept, done or dropped line. Not reviewed: ${plan.notReviewed.map((x) => x.text).join("; ")}.`);
      applyWeekPlan(c, plan, (n) => `c-${op}-${n}`, hooks.afterChange);
      c.appliedUpdates = [...(c.appliedUpdates ?? []), op];
      return { data: c, body };
    });
  } catch (error) {
    if (error instanceof AlreadyApplied) return { status: "already-applied", message: ALREADY_APPLIED };
    throw error;
  }
  return { status: "applied" };
}
