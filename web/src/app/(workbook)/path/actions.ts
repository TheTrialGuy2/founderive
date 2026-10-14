"use server";

import { bumpOutreach, chooseFocus, setOutreach, setTalkGoal } from "@/commands/checkin";
import { markStepDone, planConversation, reopenStep } from "@/commands/path";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function bumpOutreachAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => bumpOutreach(field(fd, "week"), field(fd, "which")));
}

export async function saveOutreachAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { reached: field(fd, "reached"), replied: field(fd, "replied") };
  return run(() => setOutreach(field(fd, "week"), values.reached, values.replied), values);
}

export async function saveTalkGoalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { goal: field(fd, "goal") };
  return run(() => setTalkGoal(field(fd, "week"), values.goal), values);
}

export async function chooseFocusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => chooseFocus(field(fd, "week"), field(fd, "step")), { step: field(fd, "step") });
}

export async function markStepDoneAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { reason: field(fd, "reason") };
  return run(async () => markStepDone(field(fd, "id"), values.reason, await loadFounderToday()), values);
}

export async function reopenStepAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => reopenStep(field(fd, "id")));
}

export async function planConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { who: field(fd, "who"), due: field(fd, "due") };
  return run(() => planConversation(field(fd, "week"), field(fd, "id"), values), values);
}
