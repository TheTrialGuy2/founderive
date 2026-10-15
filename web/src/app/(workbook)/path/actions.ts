"use server";

import { redirect } from "next/navigation";
import { bumpOutreach, chooseFocus, setOutreach, setTalkGoal } from "@/commands/checkin";
import { markStepDone, planConversation, reopenStep } from "@/commands/path";
import { assertThisWeek, loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { safeReturnTo } from "@/lib/return-to";
import { field, run } from "../action-utils";

// Every action here that takes a hidden `week` writes this week's check-in, so a page left open from an earlier week
// is refused (with what was typed kept) rather than writing to last week.

export async function bumpOutreachAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await bumpOutreach(field(fd, "week"), field(fd, "which"), field(fd, "audience") || "customer");
  });
}

export async function saveOutreachAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { reached: field(fd, "reached"), replied: field(fd, "replied") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await setOutreach(field(fd, "week"), values.reached, values.replied, field(fd, "audience") || "customer");
  }, values);
}

export async function saveTalkGoalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { goal: field(fd, "goal") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await setTalkGoal(field(fd, "week"), values.goal);
  }, values);
}

export async function chooseFocusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(
    async () => {
      await assertThisWeek(field(fd, "week"));
      await chooseFocus(field(fd, "week"), field(fd, "step"));
    },
    { step: field(fd, "step") },
  );
}

/** Marks the step done, then moves on: to the next step's page (`next`, checked), or Home when there's none. */
export async function markStepDoneAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { reason: field(fd, "reason") };
  try {
    await markStepDone(field(fd, "id"), values.reason, await loadFounderToday());
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Couldn't save. Try again.", values };
  }
  // redirect() throws, so it stays outside the try block.
  redirect(safeReturnTo(field(fd, "next")) ?? "/today");
}

export async function reopenStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => reopenStep(field(fd, "id")));
}

/** Plans a conversation about step `id` (from the Customer step page, or People where the founder picks the step). */
export async function planConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { who: field(fd, "who"), due: field(fd, "due"), id: field(fd, "id") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await planConversation(field(fd, "week"), values.id, values);
  }, values);
}
