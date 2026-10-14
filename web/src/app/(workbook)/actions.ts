"use server";

import { redirect } from "next/navigation";
import { addCommitment, recordChoice, setBlocker, setCommitmentStatus, setOutcome } from "@/commands/checkin";
import { setHomeworkStatus } from "@/commands/homework";
import { LAST_STEP, parseSetupStep, saveSetupStep } from "@/commands/setup";
import { assertThisWeek } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "./action-utils";

export async function saveSetupStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const step = Number(field(fd, "step"));
  const parsed = parseSetupStep(step, fd);
  if (!parsed.ok) return { status: "error", message: parsed.errors.step ?? "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  let wasComplete = false;
  try {
    ({ wasComplete } = await saveSetupStep(step, parsed.patch));
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save this step. Try again.", values: parsed.values };
  }
  // A completed setup lets a founder jump to any step to edit it; saving from there returns to /today rather than
  // walking the rest of the steps again.
  redirect(wasComplete || step >= LAST_STEP ? "/today" : `/setup?step=${step + 1}`);
}

export async function saveOutcome(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await setOutcome(field(fd, "week"), field(fd, "outcome"));
  }, { outcome: field(fd, "outcome") });
}

export async function saveNewCommitment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { text: field(fd, "text"), due: field(fd, "due") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await addCommitment(field(fd, "week"), { text: values.text, due: values.due || null });
  }, values);
}

export async function saveCommitmentStatus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => setCommitmentStatus(field(fd, "week"), field(fd, "id"), field(fd, "status"), field(fd, "reason")), { reason: field(fd, "reason") });
}

export async function saveBlocker(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { blocker: field(fd, "blocker"), help: field(fd, "help") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await setBlocker(field(fd, "week"), values.blocker, values.help);
  }, values);
}

export async function saveHomeworkStatus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => setHomeworkStatus(Number(field(fd, "programWeek")), field(fd, "id"), field(fd, "status"), field(fd, "reason")), { reason: field(fd, "reason") });
}

export async function addGuideStep(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await addCommitment(field(fd, "week"), { text: field(fd, "text"), link: `guide:${field(fd, "guideId")}` });
  }, { text: field(fd, "text") });
}

export async function chooseNotNow(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { choice: field(fd, "choice"), reason: field(fd, "reason"), until: field(fd, "until"), replacement: field(fd, "replacement") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await recordChoice(field(fd, "week"), field(fd, "today"), {
      actionId: field(fd, "actionId"),
      label: field(fd, "label"),
      choice: values.choice as "dismissed" | "deferred" | "replaced",
      reason: values.reason,
      until: values.until || null,
      replacement: values.replacement || null,
    });
  }, values);
}
