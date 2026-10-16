"use server";

import { createDecision, parseDecisionForm, recordOutcome, resolveDecision } from "@/commands/decisions";
import { isRealDate } from "@/commands/form";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function createDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseDecisionForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  return run(() => createDecision(parsed.input), parsed.values);
}

export async function resolveDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { decision: field(fd, "decision"), why: field(fd, "why"), reversible: field(fd, "reversible"), revisitOn: field(fd, "revisitOn") };
  const errors: Record<string, string> = {};
  if (!values.decision.trim()) errors.decision = "Say what you decided.";
  if (!values.why.trim()) errors.why = "Say why. Future you will want to know.";
  if (values.reversible !== "yes" && values.reversible !== "no") errors.reversible = "Say whether this is easy to undo.";
  if (values.revisitOn && !isRealDate(values.revisitOn)) errors.revisitOn = "Use a real revisit date.";
  if (Object.keys(errors).length > 0) return { status: "error", message: "Check the highlighted answers.", errors, values };
  return run(() => resolveDecision(field(fd, "path"), values), values);
}

/** The founder's own words on what came of a decision. The date is the app's today (the founder's pin, if set), never the form's. */
export async function recordOutcomeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { outcome: field(fd, "outcome") };
  return run(async () => recordOutcome(field(fd, "path"), values.outcome, await loadFounderToday()), values);
}
