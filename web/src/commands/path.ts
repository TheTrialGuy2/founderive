import { CONTACT_DETAILS_MESSAGE, looksLikeContactDetails } from "../core/privacy";
import { updateEntry } from "../store/update";
import { blockPath, loadCanvasDefs } from "./canvas";
import { addCommitment } from "./checkin";
import { isRealDate } from "./form";

async function stepDef(id: string) {
  const { defs } = await loadCanvasDefs();
  const def = defs.find((d) => d.id === id);
  if (!def) throw new Error(`"${id}" isn't a step on your path. Reload the page.`);
  return def;
}

/** The founder marks a step done, with an optional "ready to move on because…". The answer is untouched. */
export async function markStepDone(id: string, reason: string, today: string): Promise<void> {
  await stepDef(id);
  await updateEntry("canvasBlock", blockPath(id), (data, body) => ({
    data: { ...(data ?? { id, text: "", status: "untested" as const, history: [] }), done: today, doneReason: reason.trim() || null },
    body,
  }));
}

/** Reopens a done step. The answer and its history stay exactly as they were. */
export async function reopenStep(id: string): Promise<void> {
  await stepDef(id);
  await updateEntry("canvasBlock", blockPath(id), (data, body) => {
    if (!data) throw new Error(`founder-data/${blockPath(id)} isn't there anymore. Reload the page.`);
    return { data: { ...data, done: null, doneReason: null }, body };
  });
}

/**
 * Plans one conversation for a step: a commitment linked `step:<id>`, so Home and the step page know it's planned.
 * `who` is a first name, a role or "someone who…", never contact details.
 */
export async function planConversation(weekId: string, stepId: string, input: { who: string; due: string }): Promise<string> {
  const def = await stepDef(stepId);
  const who = input.who.trim();
  if (!who) throw new Error('Say who you\'ll talk to: a first name, a role, or "someone who…".');
  if (looksLikeContactDetails(who)) throw new Error(CONTACT_DETAILS_MESSAGE);
  if (!isRealDate(input.due)) throw new Error("Pick the day you'll talk to them.");
  return addCommitment(weekId, { text: `Talk to ${who} about ${def.title}`, due: input.due, link: `step:${stepId}` });
}
