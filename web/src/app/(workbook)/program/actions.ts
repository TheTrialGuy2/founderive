"use server";

import { markSessionHeld } from "@/commands/program";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function markSessionHeldAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { date: field(fd, "date"), note: field(fd, "note") };
  return run(() => markSessionHeld(Number(field(fd, "week")), values.date, values.note), values);
}
