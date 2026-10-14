"use server";

import { refresh } from "next/cache";
import { confirmAllImportedConversations, confirmImportedConversation } from "@/commands/conversations";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function confirmImportedConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => confirmImportedConversation(field(fd, "path")));
}

/** Confirms every imported conversation; the count and any files that failed come back for the page to say in words. */
export async function confirmAllImportedAction(): Promise<ActionState> {
  try {
    const r = await confirmAllImportedConversations();
    refresh();
    return { status: "saved", result: { confirmed: String(r.confirmed), failed: JSON.stringify(r.failed) } };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't confirm them. Nothing else changed. Try again." };
  }
}
