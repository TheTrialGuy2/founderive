"use server";

import { refresh } from "next/cache";
import { applyWeekUpdate, confirmImportedRecord, createImportDrafts, dismissBringWhatYouHave } from "@/commands/import";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function createImportAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const answer = String(fd.get("answer") ?? "");
  try {
    const result = await createImportDrafts(answer, await loadFounderToday());
    refresh();
    return { status: "saved", result: { json: JSON.stringify(result) } };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't create the drafts. Try again.", values: { answer } };
  }
}

export async function applyWeekUpdateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => applyWeekUpdate(field(fd, "week"), String(fd.get("update") ?? "")));
}

export async function confirmImportedRecordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => confirmImportedRecord(field(fd, "path")));
}

export async function dismissBringWhatYouHaveAction(): Promise<ActionState> {
  return run(() => dismissBringWhatYouHave());
}
