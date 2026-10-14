"use server";

import { redirect } from "next/navigation";
import { addFollowUp, confirmWhatChanges, createConversation, parseConversationForm, setFollowUpStatus, updateConversation } from "@/commands/conversations";
import { slugOf } from "@/core/slug";
import type { ActionState } from "@/lib/action-state";
import { safeReturnTo } from "@/lib/return-to";
import { field, run } from "../action-utils";

export async function createConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseConversationForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  let rel = "";
  try {
    rel = await createConversation(parsed.input);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save the conversation. Try again.", values: parsed.values };
  }
  // redirect() throws, so it stays outside the try block.
  redirect(safeReturnTo(field(fd, "returnTo")) ?? `/conversations/${slugOf(rel)}`);
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
