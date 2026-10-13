"use server";

import { refresh } from "next/cache";
import { applyWeekUpdate, confirmImportedRecord, createImportDrafts, dismissBringWhatYouHave } from "@/commands/import";
import { FOUNDER_LABELS, type FounderField } from "@/commands/paste-bridge";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function createImportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const answer = String(fd.get("answer") ?? "");
  // Only the founder.md values left checked in the preview are written.
  const founderFields = fd.getAll("founderField").filter((v): v is FounderField => typeof v === "string" && v in FOUNDER_LABELS);
  try {
    const result = await createImportDrafts(answer, await loadFounderToday(), { founderFields });
    refresh();
    return { status: "saved", result: { json: JSON.stringify(result) } };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't create the drafts. Try again.", values: { answer } };
  }
}

export async function applyWeekUpdateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    // The current week is worked out here on the server; a page left open from last week is refused.
    const result = await applyWeekUpdate(field(fd, "week"), String(fd.get("update") ?? ""), await loadFounderToday());
    refresh();
    return result.status === "already-applied" ? { status: "saved", message: result.message } : { status: "saved" };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't apply the update. Try again." };
  }
}

export async function confirmImportedRecordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => confirmImportedRecord(field(fd, "path")));
}

export async function dismissBringWhatYouHaveAction(): Promise<ActionState> {
  return run(() => dismissBringWhatYouHave());
}
