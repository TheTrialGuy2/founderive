"use server";

import { redirect } from "next/navigation";
import { addFollowUp, confirmWhatChanges, createConversation, parseConversationForm, setFollowUpStatus, updateConversation } from "@/commands/conversations";
import { markPlannedConversationDone } from "@/commands/path";
import { slugOf } from "@/core/slug";
import type { ActionState } from "@/lib/action-state";
import { safeReturnTo } from "@/lib/return-to";
import { field, run } from "../action-utils";

export async function createConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseConversationForm(fd);
  // The "Mark … done" checkbox for a planned conversation, kept as the founder left it if the form comes back.
  const planDone = field(fd, "planDone") === "on";
  const values = { ...parsed.values, planDone: planDone ? "on" : "" };
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values };
  let rel = "";
  try {
    rel = await createConversation(parsed.input);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save the conversation. Try again.", values };
  }
  // The conversation is saved; closing the plan it came from is a second, smaller write. A plan that's gone or already
  // closed is ignored, and a failure here mustn't send the founder back to save the conversation twice.
  if (planDone) await markPlannedConversationDone(field(fd, "plan")).catch(() => undefined);
  // redirect() throws, so it stays outside the try block.
  const detail = `/conversations/${slugOf(rel)}`;
  const returnTo = safeReturnTo(field(fd, "returnTo"));
  redirect(returnTo ? `${detail}?returnTo=${encodeURIComponent(returnTo)}` : detail);
}

export async function updateConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseConversationForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  return run(() => updateConversation(field(fd, "path"), parsed.input), parsed.values);
}

export async function addFollowUpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { text: field(fd, "text"), due: field(fd, "due") };
  return run(() => addFollowUp(field(fd, "path"), { text: values.text, due: values.due || null }), values);
}

export async function setFollowUpStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => setFollowUpStatus(field(fd, "path"), field(fd, "id"), field(fd, "status")));
}

export async function confirmWhatChangesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { whatChanges: field(fd, "whatChanges") };
  return run(() => confirmWhatChanges(field(fd, "path"), values.whatChanges), values);
}
