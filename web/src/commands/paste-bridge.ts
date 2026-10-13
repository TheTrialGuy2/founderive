// Parsers for blocks pasted back from a browser chat (the owner's PARSER REQUIREMENTS). Pure: no files are touched here,
// so the same code runs in the live preview and again on the server before anything is written.
import { NONE_OPEN, NONE_YET } from "../lib/prompts";
import { CONVERSATION_TYPES, type ConversationType, type KindData } from "../store/schemas";
import type { ConversationInput } from "./conversations";
import { isRealDate, oneOf } from "./form";

const KEY_LINE = /^([A-Za-z][A-Za-z-]*):\s*(.*)$/;
const TYPES_TEXT = "customer, prospect, mentor, partner, investor or other";
const APP_FILLS = new Set([NONE_YET, NONE_OPEN]);

/** The text inside ```<lang> … ```, or the whole text when the fence was lost in copying. A lost closing fence reads to the end. */
export function blockBody(text: string, lang: string): string {
  const m = new RegExp("```" + lang + "[^\\n]*\\n([\\s\\S]*?)```").exec(text);
  if (m) return m[1];
  const open = new RegExp("```" + lang + "[^\\n]*\\n([\\s\\S]*)$").exec(text);
  return open ? open[1] : text;
}

/** A value copied from the prompt's template rather than the founder's words: "…", "..." or "<something>". */
const isPlaceholder = (v: string) => /^(…|\.{3})$/.test(v) || /^<[^<>]*>$/.test(v);
const placeholderError = (n: number, v: string) => `Line ${n}: "${v}" is a placeholder from the prompt, not your words. Replace it or leave the line out.`;

/** Errors in line order; ones without a line number (about the whole paste) come last. Stable for equal lines. */
function byLine(errors: string[]): string[] {
  const n = (e: string) => Number(/^Line (\d+):/.exec(e)?.[1] ?? Infinity);
  return errors.map((e, i) => ({ e, i })).sort((a, b) => n(a.e) - n(b.e) || a.i - b.i).map((x) => x.e);
}

const FOUNDER_KEYS = { name: "name", venture: "venture", "one-liner": "oneLiner", industry: "industry", customer: "targetCustomer", problem: "problem" } as const;
export type FounderField = (typeof FOUNDER_KEYS)[keyof typeof FOUNDER_KEYS];
/** The founder.md field's name as the founder sees it in the import block. */
export const FOUNDER_LABELS: Record<FounderField, string> = { name: "name", venture: "venture", oneLiner: "one-liner", industry: "industry", targetCustomer: "customer", problem: "problem" };

export type ImportDraft =
  | { kind: "founder"; fields: Partial<Record<FounderField, string>> }
  | { kind: "canvas"; id: string; title: string; text: string }
  | { kind: "assumption"; belief: string; risk: string | null }
  | { kind: "conversation"; input: ConversationInput };

type Line = { n: number; text: string };
type Section = { heading: string; n: number; body: Line[] };

/** Reads a founderive-import block. Every line is either used or reported as an error; nothing is dropped silently. */
export function parseImportBlock(text: string, blocks: { id: string; title: string }[]): { drafts: ImportDraft[]; errors: string[] } {
  const drafts: ImportDraft[] = [];
  const errors: string[] = [];
  const sections: Section[] = [];
  blockBody(text, "founderive-import")
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const line = raw.trim();
      const n = i + 1;
      if (!line) return;
      if (line.startsWith("## ")) sections.push({ heading: line.slice(3).trim(), n, body: [] });
      else if (sections.length === 0) errors.push(`Line ${n}: "${line}" is outside any section. Start a section with ## Founder, ## Canvas: <block>, ## Assumption or ## Conversation.`);
      else sections[sections.length - 1].body.push({ n, text: line });
    });

  // key: value lines for one section; unknown, repeated, empty, placeholder or unreadable lines become errors.
  const fieldsOf = (s: Section, allowed: readonly string[]) => {
    const out: Record<string, { value: string; n: number }> = {};
    for (const l of s.body) {
      const m = KEY_LINE.exec(l.text);
      const key = m?.[1].toLowerCase();
      const value = m?.[2].trim() ?? "";
      if (!m || !key || !allowed.includes(key)) errors.push(`Line ${l.n}: can't read "${l.text}" under ## ${s.heading}.`);
      else if (key in out) errors.push(`Line ${l.n}: ${key} appears twice under ## ${s.heading}.`);
      else if (!value) errors.push(`Line ${l.n}: ${key} has no value. Leave the line out instead.`);
      else if (isPlaceholder(value)) errors.push(placeholderError(l.n, value));
      else out[key] = { value, n: l.n };
    }
    return out;
  };

  let founderSeen = false;
  const canvasSeen = new Set<string>();
  for (const s of sections) {
    const heading = s.heading.toLowerCase();
    if (heading === "founder") {
      if (founderSeen) {
        errors.push(`Line ${s.n}: ## Founder appears twice. Put all founder lines under one.`);
        continue;
      }
      founderSeen = true;
      const f = fieldsOf(s, Object.keys(FOUNDER_KEYS));
      const fields: Partial<Record<FounderField, string>> = {};
      for (const [key, { value }] of Object.entries(f)) fields[FOUNDER_KEYS[key as keyof typeof FOUNDER_KEYS]] = value;
      if (Object.keys(fields).length > 0) drafts.push({ kind: "founder", fields });
    } else if (heading.startsWith("canvas:")) {
      const name = s.heading.slice(s.heading.indexOf(":") + 1).trim();
      const block = blocks.find((b) => b.id.toLowerCase() === name.toLowerCase() || b.title.toLowerCase() === name.toLowerCase());
      const before = errors.length;
      if (!block) errors.push(`Line ${s.n}: "${name}" isn't a block in your canvas (${blocks.map((b) => b.id).join(", ")}).`);
      else if (canvasSeen.has(block.id)) errors.push(`Line ${s.n}: ## Canvas: ${name} is the second section for the ${block.id} block. Keep one.`);
      else if (s.body.length === 0) errors.push(`Line ${s.n}: ## Canvas: ${name} has no text under it.`);
      for (const l of s.body) if (isPlaceholder(l.text)) errors.push(placeholderError(l.n, l.text));
      if (block) canvasSeen.add(block.id);
      if (block && errors.length === before) drafts.push({ kind: "canvas", id: block.id, title: block.title, text: s.body.map((l) => l.text).join("\n") });
    } else if (heading === "assumption") {
      const before = errors.length;
      const f = fieldsOf(s, ["belief", "risk"]);
      if (!f.belief) errors.push(`Line ${s.n}: an assumption needs a belief: line.`);
      else if (errors.length === before) drafts.push({ kind: "assumption", belief: f.belief.value, risk: f.risk?.value ?? null });
    } else if (heading === "conversation") {
      const before = errors.length;
      const f = fieldsOf(s, ["date", "person", "type", "notes"]);
      if (!f.type) errors.push(`Line ${s.n}: a conversation needs a type: line (${TYPES_TEXT}).`);
      else if (!oneOf(CONVERSATION_TYPES, f.type.value)) errors.push(`Line ${f.type.n}: "${f.type.value}" isn't a conversation type (${TYPES_TEXT}).`);
      if (f.date && !isRealDate(f.date.value)) errors.push(`Line ${f.date.n}: "${f.date.value}" isn't a real date as YYYY-MM-DD.`);
      if (!f.person) errors.push(`Line ${s.n}: a conversation needs a person: line (a first name or a role).`);
      if (errors.length === before && f.type && f.person) {
        drafts.push({
          kind: "conversation",
          input: {
            type: f.type.value as ConversationType,
            person: f.person.value,
            org: null,
            date: f.date?.value ?? null,
            segment: null,
            context: null,
            questionsAsked: null,
            observedBehavior: null,
            quotes: [],
            numbers: [],
            alternatives: null,
            urgency: null,
            buyingProcess: null,
            areas: [],
            followUps: [],
            whatChanges: null,
            whatChangesConfirmed: false, // an import never confirms what a conversation changes
            notes: f.notes?.value ?? "",
          },
        });
      }
    } else errors.push(`Line ${s.n}: "## ${s.heading}" isn't a section Founderive reads.`);
  }
  return { drafts, errors: byLine(errors) };
}

/** One preview line per draft. */
export function describeDraft(d: ImportDraft): string {
  if (d.kind === "founder") return `Founder details: ${Object.keys(d.fields).map((k) => FOUNDER_LABELS[k as FounderField]).join(", ")} (only where empty)`;
  if (d.kind === "canvas") return `Canvas · ${d.title}`;
  if (d.kind === "assumption") return `Assumption (not saved; you'll get a link to make it a test): ${d.belief}`;
  return `Conversation: ${d.input.person} (${d.input.type}), ${d.input.date ?? "date unknown"}`;
}

export type WeekPlan = {
  outcome: string | null; // null keeps the current outcome
  kept: { id: string; text: string }[];
  done: { id: string; text: string }[];
  dropped: { id: string; text: string; reason: string }[];
  added: { text: string; due: string | null }[];
  blocker: string | null;
  help: string | null;
  notReviewed: { id: string; text: string }[];
  errors: string[]; // any error blocks the whole update
};

const WEEK_KEYS = new Set(["outcome", "blocker", "help", "kept", "done", "dropped", "new"]);

/** Reads a founderive-week block against this week's open commitments. */
export function parseWeekBlock(text: string, open: { id: string; text: string }[]): WeekPlan {
  const plan: WeekPlan = { outcome: null, kept: [], done: [], dropped: [], added: [], blocker: null, help: null, notReviewed: [], errors: [] };
  const status = new Map<string, string>();
  const once = new Set<string>();
  let anyLine = false;
  blockBody(text, "founderive-week")
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const line = raw.trim();
      const n = i + 1;
      if (!line) return;
      anyLine = true;
      const m = KEY_LINE.exec(line);
      if (!m) return void plan.errors.push(`Line ${n}: can't read "${line}".`);
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      if (!WEEK_KEYS.has(key)) return void plan.errors.push(`Line ${n}: "${key}" isn't a line Founderive reads.`);
      if (APP_FILLS.has(value.toLowerCase())) return; // "none yet" / "none open" are the app's own words, not data
      if (key === "outcome" || key === "blocker" || key === "help") {
        if (once.has(key)) return void plan.errors.push(`Line ${n}: ${key} appears twice.`);
        once.add(key);
        if (!value) return void plan.errors.push(`Line ${n}: ${key} has no value. Leave the line out instead.`);
        if (isPlaceholder(value)) return void plan.errors.push(placeholderError(n, value));
        if (key === "outcome") plan.outcome = value;
        else if (key === "blocker") plan.blocker = value;
        else plan.help = value;
        return;
      }
      if (key === "kept" || key === "done" || key === "dropped") {
        const bar = value.indexOf("|");
        const id = (bar < 0 ? value : value.slice(0, bar)).trim();
        const reason = bar < 0 ? "" : value.slice(bar + 1).trim();
        if (!id) return void plan.errors.push(`Line ${n}: ${key} needs a commitment id.`);
        const c = open.find((x) => x.id === id);
        if (!c) return void plan.errors.push(`Line ${n}: "${id}" isn't one of this week's open commitments.`);
        if (status.has(id)) return void plan.errors.push(`Line ${n}: ${id} already has a ${status.get(id)} line.`);
        status.set(id, key);
        if (key === "dropped") {
          if (!reason) return void plan.errors.push(`Line ${n}: dropped ${id} needs a reason after the bar.`);
          if (isPlaceholder(reason)) return void plan.errors.push(placeholderError(n, reason));
          plan.dropped.push({ id, text: c.text, reason });
        } else plan[key].push({ id, text: c.text });
        return;
      }
      // new
      const bar = value.indexOf("|");
      const what = (bar < 0 ? value : value.slice(0, bar)).trim();
      const due = bar < 0 ? "" : value.slice(bar + 1).trim();
      if (!what) return void plan.errors.push(`Line ${n}: new needs what you're committing to before the bar.`);
      if (isPlaceholder(what)) return void plan.errors.push(placeholderError(n, what));
      if (due && !isRealDate(due)) return void plan.errors.push(`Line ${n}: "${due}" isn't a date as YYYY-MM-DD. Leave it blank after the bar if there's no date.`);
      plan.added.push({ text: what, due: due || null });
    });
  if (!anyLine) plan.errors.push("There's nothing to apply. Paste the whole block your chat gave you.");
  plan.notReviewed = open.filter((c) => !status.has(c.id));
  return plan;
}

type WeekCheckin = KindData<"checkin">;

/**
 * Applies a checked plan to a check-in object in memory. Called inside one updateEntry callback, so the file is
 * written once with every change, or not at all. An omitted blocker or help clears it: the weekly prompt asks about
 * both every week. `afterChange` is a test seam that runs after each change.
 */
export function applyWeekPlan(c: WeekCheckin, plan: WeekPlan, makeId: () => string, afterChange: () => void = () => {}): void {
  if (plan.outcome) {
    c.outcome = plan.outcome;
    afterChange();
  }
  for (const d of plan.done) {
    const item = c.commitments.find((x) => x.id === d.id);
    if (!item) throw new Error(`${d.id} isn't in this week's check-in anymore. Reload and paste again.`);
    item.status = "done";
    item.reason = null;
    afterChange();
  }
  for (const d of plan.dropped) {
    const item = c.commitments.find((x) => x.id === d.id);
    if (!item) throw new Error(`${d.id} isn't in this week's check-in anymore. Reload and paste again.`);
    item.status = "dropped";
    item.reason = d.reason;
    afterChange();
  }
  for (const a of plan.added) {
    c.commitments.push({ id: makeId(), text: a.text, due: a.due, status: "open", reason: null, link: null });
    afterChange();
  }
  c.blocker = plan.blocker;
  c.helpNeeded = plan.help;
  afterChange();
}
