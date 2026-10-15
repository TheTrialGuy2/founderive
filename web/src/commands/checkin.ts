import { randomBytes } from "node:crypto";
import { listEntries, readEntry } from "../store/read";
import { CONVERSATION_TYPES, WEEKDAYS, type ConversationType, type KindData } from "../store/schemas";
import { updateEntry } from "../store/update";
import { loadCanvasDefs } from "./canvas";
import { addDays } from "../core/week";

export type Checkin = KindData<"checkin">;
type ChoiceInput = { actionId: string; label: string; choice: "dismissed" | "deferred" | "replaced"; reason: string; until?: string | null; replacement?: string | null };

export const checkinPath = (weekId: string) => `checkins/${weekId}.md`;
/** The week a check-in file is for, from its name (checkins/YYYY-Www.md). The inverse of checkinPath. */
export const weekOfCheckinPath = (rel: string) => rel.slice("checkins/".length, -".md".length);
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;

function required(value: string | null | undefined, message: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(message);
  return v;
}

/** This week's check-in, or an empty one. Refuses an invalid file so a save can't overwrite it. */
export async function loadCheckin(weekId: string): Promise<{ data: Checkin; body: string }> {
  const entry = await readEntry("checkin", checkinPath(weekId));
  if (!entry) return { data: { week: weekId, commitments: [], nextStepLog: [] }, body: "" };
  if (!entry.ok) throw new Error(`Fix founder-data/${entry.path} first: ${entry.error}`);
  return { data: entry.data, body: entry.body };
}

/** Changes this week's check-in without losing a save made at the same moment. `change` may run more than once. */
async function update(weekId: string, change: (c: Checkin) => void): Promise<void> {
  await updateEntry("checkin", checkinPath(weekId), (data, body) => {
    const c: Checkin = data ?? { week: weekId, commitments: [], nextStepLog: [] };
    change(c);
    return { data: c, body };
  });
}

export async function setOutcome(weekId: string, outcome: string): Promise<void> {
  const text = required(outcome, "Write this week's outcome in one sentence.");
  return update(weekId, (c) => {
    c.outcome = text;
  });
}

export async function addCommitment(weekId: string, input: { text: string; due?: string | null; link?: string | null }): Promise<string> {
  const text = required(input.text, "Say what you're committing to.");
  const id = newId("c");
  await update(weekId, (c) => {
    c.commitments.push({ id, text, due: input.due || null, status: "open", reason: null, link: input.link || null });
  });
  return id;
}

type Commitment = Checkin["commitments"][number];

/**
 * Adds an open commitment unless one that `matches` is already in the week, and returns the one that's there. The
 * final check runs inside the check-in's own read-change-write, so two calls at the same moment still add it once.
 * When it's already there, the file isn't written at all.
 */
export async function appendCommitmentOnce(
  weekId: string,
  item: { id: string; text: string; due: string | null; link: string | null },
  matches: (c: Commitment) => boolean,
): Promise<Commitment> {
  const text = required(item.text, "Say what you're committing to.");
  const existing = (await loadCheckin(weekId)).data.commitments.find(matches);
  if (existing) return existing;
  const { data } = await updateEntry("checkin", checkinPath(weekId), (current, body) => {
    const c: Checkin = current ?? { week: weekId, commitments: [], nextStepLog: [] };
    if (c.commitments.some(matches)) return { data: c, body };
    return { data: { ...c, commitments: [...c.commitments, { id: item.id, text, due: item.due || null, status: "open", reason: null, link: item.link || null }] }, body };
  });
  const saved = data.commitments.find(matches);
  if (!saved) throw new Error("the check-in didn't keep it");
  return saved;
}

/**
 * Materialises weekly definitions into ordinary commitments in `weekId`. IDs are deterministic, so repeated Home or
 * CLI reads are safe. Definitions stay in the check-in where the founder made them and never appear in Due themselves.
 */
export async function materializeRepeatingCommitments(weekId: string, weekStartsOn: string, today: string): Promise<void> {
  const checkins = (await listEntries("checkin")).flatMap((entry) =>
    entry.ok && weekOfCheckinPath(entry.path) <= weekId ? [{ week: weekOfCheckinPath(entry.path), commitments: entry.data.commitments }] : [],
  );
  const definitions = checkins.flatMap((source) => source.commitments.filter((commitment) => commitment.repeat && commitment.status === "open").map((commitment) => ({ sourceWeek: source.week, commitment })));
  if (definitions.length === 0) return;

  const target = (await loadCheckin(weekId)).data;
  const missing = definitions.flatMap(({ sourceWeek, commitment }) => {
    const repeat = commitment.repeat!;
    const dueDay = commitment.due && WEEKDAYS.includes(commitment.due as (typeof WEEKDAYS)[number]) ? (commitment.due as (typeof WEEKDAYS)[number]) : null;
    const datedDay = commitment.due && /^\d{4}-/.test(commitment.due) ? WEEKDAYS[(new Date(`${commitment.due}T00:00:00Z`).getUTCDay() + 6) % 7] : null;
    const days = repeat.days ?? (dueDay || datedDay ? [dueDay ?? datedDay!] : [null]);
    return days.flatMap((day) => {
      const due = day ? addDays(weekStartsOn, WEEKDAYS.indexOf(day)) : null;
      if (repeat.until && (due ?? weekStartsOn) > repeat.until) return [];
      // A definition made during this week starts now; it does not manufacture work that was already late.
      if (sourceWeek === weekId && due && due < today) return [];
      const dayPart = days.length > 1 && day ? `-${day}` : "";
      // IDs include the definition's week because commitment ids are only unique inside one check-in.
      const id = `${commitment.id}-${sourceWeek}${dayPart}-${weekId}`;
      return target.commitments.some((item) => item.id === id) ? [] : [{ id, text: commitment.text, due, link: commitment.link ?? null }];
    });
  });
  // Home reads should be read-only after the week's instances have been created. This also avoids a data-events
  // refresh loop: an atomic rewrite is itself an event, even when the serialised contents are unchanged.
  if (missing.length === 0) return;

  await update(weekId, (target) => {
    for (const item of missing) {
      if (target.commitments.some((commitment) => commitment.id === item.id)) continue;
      target.commitments.push({ ...item, status: "open", reason: null });
    }
  });
}

export async function setCommitmentStatus(weekId: string, id: string, status: string, reason?: string): Promise<void> {
  if (status !== "open" && status !== "done" && status !== "dropped") throw new Error(`Unknown status: ${status}`);
  const why = status === "dropped" ? required(reason, "Say why you're dropping it.") : null;
  return update(weekId, (c) => {
    const item = c.commitments.find((x) => x.id === id);
    if (!item) throw new Error("That commitment no longer exists. Reload the page.");
    item.status = status;
    item.reason = why;
  });
}

export function setBlocker(weekId: string, blocker: string, help: string): Promise<void> {
  return update(weekId, (c) => {
    c.blocker = blocker.trim() || null;
    c.helpNeeded = help.trim() || null;
  });
}

/** Logs "not now" on a recommended action. Replacing it adds the replacement as a commitment. */
export async function recordChoice(weekId: string, today: string, input: ChoiceInput): Promise<void> {
  const reason = required(input.reason, "Add a short reason.");
  let until: string | null = null;
  let replacement: string | null = null;
  if (input.choice === "deferred") {
    until = required(input.until, "Pick the date to be reminded.");
    if (until <= today) throw new Error("Pick a later date to be reminded.");
  }
  if (input.choice === "replaced") replacement = required(input.replacement, "Say what you'll do instead.");
  const replacementId = newId("c");
  return update(weekId, (c) => {
    c.nextStepLog.push({ date: today, actionId: input.actionId, label: input.label, choice: input.choice, reason, until, replacement, via: "app" });
    if (replacement) c.commitments.push({ id: replacementId, text: replacement, due: null, status: "open", reason: null, link: null });
  });
}

const wholeNumber = (value: string, message: string): number => {
  const n = Number(value.trim());
  if (!value.trim() || !Number.isInteger(n) || n < 0) throw new Error(message);
  return n;
};

/** Adds one to this week's outreach: someone you reached out to, or someone who replied. */
export async function bumpOutreach(weekId: string, which: string, audience: string = "customer"): Promise<void> {
  if (which !== "reached" && which !== "replied") throw new Error(`Unknown outreach count: ${which}`);
  if (!CONVERSATION_TYPES.includes(audience as ConversationType)) throw new Error(`Unknown outreach audience: ${audience}`);
  return update(weekId, (c) => {
    const rows = c.outreach ?? [];
    const row = rows.find((item) => item.audience === audience);
    if (row) row[which] += 1;
    else rows.push({ audience: audience as ConversationType, reached: which === "reached" ? 1 : 0, replied: which === "replied" ? 1 : 0 });
    c.outreach = rows;
  });
}

/** Corrects this week's outreach by hand. Replied may be more than reached: people write to you first. */
export async function setOutreach(weekId: string, reached: string, replied: string, audience: string = "customer"): Promise<void> {
  const r = wholeNumber(reached, "Reached needs a whole number, 0 or more.");
  const p = wholeNumber(replied, "Replied needs a whole number, 0 or more.");
  if (!CONVERSATION_TYPES.includes(audience as ConversationType)) throw new Error(`Unknown outreach audience: ${audience}`);
  return update(weekId, (c) => {
    const rows = c.outreach ?? [];
    const row = rows.find((item) => item.audience === audience);
    if (row) Object.assign(row, { reached: r, replied: p });
    else rows.push({ audience: audience as ConversationType, reached: r, replied: p });
    c.outreach = rows;
  });
}

/** This week's goal for people talked to. */
export async function setTalkGoal(weekId: string, goal: string): Promise<void> {
  const n = Number(goal.trim());
  if (!Number.isInteger(n) || n < 1 || n > 50) throw new Error("Pick a goal between 1 and 50.");
  return update(weekId, (c) => {
    c.talkGoal = n;
  });
}

/** Once every step is done, the step to deepen this week. Refused while any step (You included) isn't done. */
export async function chooseFocus(weekId: string, stepId: string): Promise<void> {
  const { defs } = await loadCanvasDefs();
  if (!defs.some((d) => d.id === stepId)) throw new Error(`"${stepId}" isn't a step on your path. Reload the page.`);
  const founder = await readEntry("founder", "founder.md");
  const done = new Set((await listEntries("canvasBlock")).flatMap((e) => (e.ok && e.data.done ? [e.data.id] : [])));
  const notDone = !(founder?.ok && founder.data.setupComplete) ? "You" : defs.find((d) => !done.has(d.id))?.title;
  if (notDone) throw new Error(`Finish or reopen steps first: ${notDone} isn't done.`);
  return update(weekId, (c) => {
    c.focus = stepId;
  });
}
