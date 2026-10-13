import { randomBytes } from "node:crypto";
import { readEntry } from "../store/read";
import type { KindData } from "../store/schemas";
import { updateEntry } from "../store/update";

export type Checkin = KindData<"checkin">;
type ChoiceInput = { actionId: string; label: string; choice: "dismissed" | "deferred" | "replaced"; reason: string; until?: string | null; replacement?: string | null };

export const checkinPath = (weekId: string) => `checkins/${weekId}.md`;
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
