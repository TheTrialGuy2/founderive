"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { loadFounderToday } from "@/commands/today";
import { abandonTest, completeTest, createTest, parseTestForm, saveEvidenceNotes, setEvidenceStrength, startTest } from "@/commands/venture-tests";
import { slugOf } from "@/core/slug";
import { checkCompletion, type CompletionForm } from "@/core/venture-tests";
import type { ActionState } from "@/lib/action-state";
import { safeReturnTo } from "@/lib/return-to";
import { field, run } from "../action-utils";

export async function createTestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseTestForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  let rel = "";
  try {
    rel = await createTest(parsed.input, await loadFounderToday());
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save the test. Try again.", values: parsed.values };
  }
  // redirect() throws, so it stays outside the try block.
  redirect(safeReturnTo(field(fd, "returnTo")) ?? `/tests/${slugOf(rel)}`);
}

export async function startTestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => startTest(field(fd, "path"), await loadFounderToday()));
}

export async function setEvidenceStrengthAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => setEvidenceStrength(field(fd, "path"), field(fd, "strength")));
}

export async function saveEvidenceNotesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { notes: field(fd, "notes") };
  return run(() => saveEvidenceNotes(field(fd, "path"), values.notes), values);
}

/**
 * Adapted from the brief: `completeTest` no longer throws on a repeat completion of an already-closed test. It
 * resolves with `{ alreadyComplete: true }` instead (so two near-simultaneous submits both settle cleanly). When that
 * happens, the founder's new result and decision were NOT applied — the test kept whatever it closed with — so this
 * says so plainly, keeps their input, and skips `refresh()`: refreshing would re-render the page with `status:
 * "complete"`, unmounting this form before the message could be seen.
 */
export async function completeTestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const form: CompletionForm = {
    result: field(fd, "result"),
    evidenceStrength: field(fd, "evidenceStrength"),
    learning: field(fd, "learning"),
    decision: field(fd, "decision"),
    why: field(fd, "why"),
    nextCommitment: field(fd, "nextCommitment"),
    nextCommitmentDue: field(fd, "nextCommitmentDue"),
  };
  const checked = checkCompletion(form);
  if (!checked.ok) return { status: "error", message: "Check the highlighted answers.", errors: checked.errors, values: form };
  try {
    const result = await completeTest(field(fd, "path"), form, await loadFounderToday());
    if (result.alreadyComplete) return { status: "error", message: "This test was already complete.", values: form };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save the test. Try again.", values: form };
  }
  refresh();
  return { status: "saved" };
}

export async function abandonTestAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { reason: field(fd, "reason") };
  return run(async () => abandonTest(field(fd, "path"), values.reason, await loadFounderToday()), values);
}
