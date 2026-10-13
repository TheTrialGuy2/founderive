"use server";

import { confirmImported, saveCanvasBlock } from "@/commands/canvas";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function saveCanvasBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { text: field(fd, "text"), status: field(fd, "status"), notes: field(fd, "notes") };
  return run(async () => saveCanvasBlock(field(fd, "id"), values, await loadFounderToday()), values);
}

export async function confirmImportedAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => confirmImported(field(fd, "id")));
}
