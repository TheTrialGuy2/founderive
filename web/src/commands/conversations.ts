import { groupConversations } from "../core/conversations";
import { CONTACT_DETAILS_MESSAGE, looksLikeContactDetails } from "../core/privacy";
import { brokenLinks, linksOf, type BrokenLink } from "../core/links";
import { pathForSlug, slugOf } from "../core/slug";
import { existingPaths, listEntries, readEntry } from "../store/read";
import { BLOCK_ID_PATTERN, CONVERSATION_TYPES, KINDS, type ConversationType, type KindData, type TestStatus } from "../store/schemas";
import { archiveEntry, ValidationError } from "../store/write";
import { updateEntry } from "../store/update";
import { newId } from "./checkin";
import { createDated, type RecordMeta } from "./create";
import { all, isRealDate, lines, oneOf, orNull, required, text, type Parsed } from "./form";

export type Conversation = KindData<"conversation">;
export type ConversationRow = { path: string; slug: string; data: Conversation };
export type TestOption = { path: string; slug: string; title: string; status: TestStatus };
export const CONVERSATIONS_DIR = "conversations";

export type ConversationInput = {
  type: ConversationType;
  person: string;
  org: string | null;
  date: string | null; // the app's form always sets it; an import may leave it unknown
  segment: string | null;
  context: string | null;
  questionsAsked: string | null;
  observedBehavior: string | null;
  quotes: string[];
  numbers: string[];
  alternatives: string | null;
  urgency: string | null;
  buyingProcess: string | null;
  areas: string[];
  followUps: { text: string; due: string | null }[];
  whatChanges: string | null;
  /** True only when the founder wrote "what this changes" themselves (their form). Anything else, such as a draft, stays unconfirmed. */
  whatChangesConfirmed?: boolean;
  notes: string;
};

const TEXT_FIELDS = ["type", "person", "org", "date", "segment", "context", "questionsAsked", "observedBehavior", "quotes", "numbers", "alternatives", "urgency", "buyingProcess", "whatChanges", "notes"] as const;

/** Reads the conversation form. Quotes and numbers are one per line; follow-ups come as parallel text and date rows. */
export function parseConversationForm(fd: FormData): Parsed<ConversationInput> {
  const values: Record<string, string> = {};
  for (const k of TEXT_FIELDS) values[k] = text(fd, k);
  const areas = all(fd, "areas").filter(Boolean);
  values.areas = areas.join(",");
  const fuText = all(fd, "followUpText");
  const fuDue = all(fd, "followUpDue");
  const errors: Record<string, string> = {};
  if (!oneOf(CONVERSATION_TYPES, values.type)) errors.type = "Pick who you talked to.";
  if (!values.person) errors.person = "Add who you talked to. A first name or a role is fine.";
  else if (looksLikeContactDetails(values.person)) errors.person = CONTACT_DETAILS_MESSAGE;
  if (!isRealDate(values.date)) errors.date = "Add the date of the conversation.";
  if (areas.some((a) => !BLOCK_ID_PATTERN.test(a))) errors.areas = "Pick areas from the list.";
  const followUps: ConversationInput["followUps"] = [];
  for (let i = 0; i < Math.max(fuText.length, fuDue.length); i++) {
    const t = fuText[i] ?? "";
    const due = fuDue[i] ?? "";
    values[`followUpText${i}`] = t;
    values[`followUpDue${i}`] = due;
    if (!t && due) errors[`followUpText${i}`] = "Say what the follow-up is, or clear its date.";
    else if (due && !isRealDate(due)) errors[`followUpDue${i}`] = "Use a real date.";
    else if (t) followUps.push({ text: t, due: due || null });
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors, values };
  return {
    ok: true,
    values,
    input: {
      type: values.type as ConversationType,
      person: values.person,
      org: orNull(values.org),
      date: values.date,
      segment: orNull(values.segment),
      context: orNull(values.context),
      questionsAsked: orNull(values.questionsAsked),
      observedBehavior: orNull(values.observedBehavior),
      quotes: lines(values.quotes),
      numbers: lines(values.numbers),
      alternatives: orNull(values.alternatives),
      urgency: orNull(values.urgency),
      buyingProcess: orNull(values.buyingProcess),
      areas,
      followUps,
      whatChanges: orNull(values.whatChanges),
      whatChangesConfirmed: !!values.whatChanges, // typed by the founder on their own form
      notes: values.notes,
    },
  };
}

const notesBody = (notes: string) => (notes.trim() ? `${notes.trim()}\n` : "");
/** Every write path checks the person, so contact details never reach a file (the schema checks hand-written ones). */
const refuseContactDetails = (person: string) => {
  if (looksLikeContactDetails(person)) throw new Error(CONTACT_DETAILS_MESSAGE);
};
const missing = (rel: string) => new Error(`founder-data/${rel} isn't there anymore. Reload the page.`);

/**
 * Logs a conversation as a new dated file, never overwriting. "What this changes" is confirmed only when the caller
 * says the founder wrote it (`whatChangesConfirmed: true`, which the founder's form sets); a draft from Claude or an
 * import arrives unconfirmed. An import passes `meta`
 * (seeded, source) and `today`, which names the file when the conversation's own date is unknown.
 */
export async function createConversation(input: ConversationInput, meta: RecordMeta = {}, today?: string): Promise<string> {
  refuseContactDetails(input.person);
  const fileDate = input.date ?? today;
  if (!fileDate) throw new Error("Add the date of the conversation.");
  const data: Conversation = {
    ...meta,
    type: input.type,
    person: input.person,
    org: input.org,
    date: input.date,
    segment: input.segment,
    context: input.context,
    questionsAsked: input.questionsAsked,
    observedBehavior: input.observedBehavior,
    quotes: input.quotes,
    numbers: input.numbers,
    alternatives: input.alternatives,
    urgency: input.urgency,
    buyingProcess: input.buyingProcess,
    followUps: input.followUps.map((f) => ({ id: newId("f"), text: f.text, due: f.due, status: "open" as const })),
    relatedTests: [],
    areas: input.areas,
    whatChanges: input.whatChanges,
    whatChangesConfirmed: !!input.whatChanges && input.whatChangesConfirmed === true,
  };
  return createDated("conversation", CONVERSATIONS_DIR, fileDate, input.org ? `${input.person} ${input.org}` : input.person, data, notesBody(input.notes));
}

/** Edits a conversation's details and notes. Follow-ups, test links and "what this changes" keep their own actions. */
export async function updateConversation(rel: string, input: ConversationInput): Promise<void> {
  refuseContactDetails(input.person);
  await updateEntry("conversation", rel, (data) => {
    if (!data) throw missing(rel);
    return {
      data: {
        ...data,
        type: input.type,
        person: input.person,
        org: input.org,
        date: input.date,
        segment: input.segment,
        context: input.context,
        questionsAsked: input.questionsAsked,
        observedBehavior: input.observedBehavior,
        quotes: input.quotes,
        numbers: input.numbers,
        alternatives: input.alternatives,
        urgency: input.urgency,
        buyingProcess: input.buyingProcess,
        areas: input.areas,
      },
      body: notesBody(input.notes),
    };
  });
}

export async function addFollowUp(rel: string, input: { text: string; due: string | null }): Promise<string> {
  const t = required(input.text, "Say what the follow-up is.");
  if (input.due && !isRealDate(input.due)) throw new Error("Use a real date for the follow-up.");
  const id = newId("f");
  await updateEntry("conversation", rel, (data, body) => {
    if (!data) throw missing(rel);
    return { data: { ...data, followUps: [...data.followUps, { id, text: t, due: input.due || null, status: "open" as const }] }, body };
  });
  return id;
}

export async function setFollowUpStatus(rel: string, id: string, status: string): Promise<void> {
  if (status !== "open" && status !== "done") throw new Error(`Unknown status: ${status}`);
  const next = status;
  await updateEntry("conversation", rel, (data, body) => {
    if (!data) throw missing(rel);
    if (!data.followUps.some((f) => f.id === id)) throw new Error("That follow-up no longer exists. Reload the page.");
    return { data: { ...data, followUps: data.followUps.map((f) => (f.id === id ? { ...f, status: next } : f)) }, body };
  });
}

/** Records the founder's own reading of what this conversation changes. Claude may draft it; only this confirms it. */
export async function confirmWhatChanges(rel: string, whatChanges: string): Promise<void> {
  const t = required(whatChanges, "Say what this conversation changes, even if it's “nothing yet”.");
  await updateEntry("conversation", rel, (data, body) => {
    if (!data) throw missing(rel);
    return { data: { ...data, whatChanges: t, whatChangesConfirmed: true }, body };
  });
}

/**
 * The founder accepts an imported conversation as their own: only the `seeded` mark goes. Its source, its draft of
 * "what this changes" and that draft's unconfirmed state are kept. A conversation that isn't imported is left
 * untouched (not rewritten), and false comes back.
 */
export async function confirmImportedConversation(rel: string): Promise<boolean> {
  const entry = await readEntry("conversation", rel);
  if (!entry) throw missing(rel);
  if (!entry.ok) throw new Error(`Fix founder-data/${rel} first: ${entry.error}`);
  if (!entry.data.seeded) return false;
  try {
    await updateEntry("conversation", rel, (data, body) => {
      if (!data) throw missing(rel);
      // Confirmed meanwhile (another tab, another Confirm all): nothing to write, and it isn't counted twice.
      if (!data.seeded) throw new AlreadyConfirmed();
      const next: Conversation = { ...data };
      delete next.seeded;
      return { data: next, body };
    });
  } catch (error) {
    if (error instanceof AlreadyConfirmed) return false;
    throw error;
  }
  return true;
}

class AlreadyConfirmed extends Error {}

const refuseNonConversationPath = (rel: string) => {
  if (!KINDS.conversation.pattern.test(rel)) throw new ValidationError(`${rel} isn't a conversation file. Reload the page.`);
};

/**
 * Confirms the imported conversations the founder saw listed (`paths`), one file at a time. Any path that isn't a
 * conversation file refuses the whole request before anything changes. A listed file that isn't imported anymore, or
 * is gone, is skipped; one that can't be read is named in `broken` (People lists those to fix); `failed` keeps files
 * that couldn't be saved, and the rest go on.
 */
export async function confirmAllImportedConversations(paths: string[]): Promise<{ confirmed: number; broken: string[]; failed: { path: string; error: string }[] }> {
  const unique = [...new Set(paths)];
  unique.forEach(refuseNonConversationPath);
  let confirmed = 0;
  const broken: string[] = [];
  const failed: { path: string; error: string }[] = [];
  for (const rel of unique) {
    const e = await readEntry("conversation", rel);
    if (!e) continue;
    if (!e.ok) {
      broken.push(rel);
      continue;
    }
    if (!e.data.seeded) continue;
    try {
      if (await confirmImportedConversation(rel)) confirmed++;
    } catch (error) {
      failed.push({ path: rel, error: error instanceof Error ? error.message : "Couldn't save it. Try again." });
    }
  }
  return { confirmed, broken, failed };
}

/**
 * "Not mine": moves an imported conversation the founder doesn't recognise to `_archive/<its path>`, never deleting
 * it (moving the file back undoes it). Only imported (seeded) conversations; returns where it went.
 */
export async function archiveImportedConversation(rel: string): Promise<string> {
  refuseNonConversationPath(rel);
  const entry = await readEntry("conversation", rel);
  if (!entry) throw missing(rel);
  if (!entry.ok) throw new Error(`Fix founder-data/${rel} first: ${entry.error}`);
  if (!entry.data.seeded) throw new Error("Only imported conversations can be moved to _archive here. This one is already yours.");
  return archiveEntry(rel);
}

/** Every conversation, customer evidence apart from advice, newest first. Unreadable files are listed, never dropped. */
export async function loadConversations(): Promise<{ evidence: ConversationRow[]; advice: ConversationRow[]; flagged: { path: string; error: string }[] }> {
  const entries = await listEntries("conversation");
  const rows = entries.flatMap((e) => (e.ok ? [{ path: e.path, slug: slugOf(e.path), data: e.data }] : []));
  const flagged = entries.flatMap((e) => (e.ok ? [] : [{ path: e.path, error: e.error }]));
  return { ...groupConversations(rows), flagged };
}

export type ConversationView =
  | { status: "missing" }
  | { status: "flagged"; path: string; error: string }
  | { status: "ready"; path: string; slug: string; data: Conversation; notes: string; broken: BrokenLink[]; tests: TestOption[] };

/** One conversation by URL slug, with its broken links and every readable test (to show linked titles and to link more). */
export async function loadConversation(slug: string): Promise<ConversationView> {
  const rel = pathForSlug(CONVERSATIONS_DIR, slug);
  const entry = rel ? await readEntry("conversation", rel) : null;
  if (!entry) return { status: "missing" };
  if (!entry.ok) return { status: "flagged", path: entry.path, error: entry.error };
  const present = await existingPaths();
  const tests = (await listEntries("test")).flatMap((t) => (t.ok ? [{ path: t.path, slug: slugOf(t.path), title: t.data.title, status: t.data.status }] : []));
  return {
    status: "ready",
    path: entry.path,
    slug,
    data: entry.data,
    notes: entry.body.trim(),
    broken: brokenLinks(linksOf("conversation", entry.data), (r) => present.has(r)),
    tests,
  };
}
