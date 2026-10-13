"use server";

import { createDecision, parseDecisionForm } from "@/commands/decisions";
import type { ActionState } from "@/lib/action-state";
import { run } from "../action-utils";

export async function createDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseDecisionForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  return run(() => createDecision(parsed.input), parsed.values);
}
