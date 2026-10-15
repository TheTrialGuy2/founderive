"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { archiveImportedConversation, confirmAllImportedConversations, confirmImportedConversation } from "@/commands/conversations";
import { slugOf } from "@/core/slug";
import type { ActionState } from "@/lib/action-state";
import { field } from "../action-utils";

export async function confirmImportedConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const path = field(fd, "path");
  try {
    await confirmImportedConversation(path);
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't confirm it. Try again." };
  }
  redirect(`/conversations/${slugOf(path)}`);
}

/**
 * Confirms the imported conversations the founder saw listed (one hidden `path` per card), never one imported since.
 * The counts come back for the page to say in words.
 */
export async function confirmAllImportedAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const paths = fd.getAll("path").filter((p): p is string => typeof p === "string");
    const r = await confirmAllImportedConversations(paths);
    refresh();
    return { status: "saved", result: { confirmed: String(r.confirmed), broken: String(r.broken.length), failed: JSON.stringify(r.failed) } };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't confirm them. Nothing else changed. Try again." };
  }
}

/** "Not mine": moves an imported conversation to _archive, then says where it went (the card itself is gone). */
export async function archiveImportedConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target: string;
  try {
    target = await archiveImportedConversation(field(fd, "path"));
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't move it. Nothing changed. Try again." };
  }
  // redirect() throws, so it stays outside the try block.
  redirect(`/people?show=imported&moved=${encodeURIComponent(target)}`);
}
