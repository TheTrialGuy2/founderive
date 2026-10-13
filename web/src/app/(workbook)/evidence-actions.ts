"use server";

import { linkEvidence, unlinkEvidence } from "@/commands/venture-tests";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "./action-utils";

export async function linkEvidenceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => linkEvidence(field(fd, "test"), field(fd, "conversation")));
}

export async function unlinkEvidenceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => unlinkEvidence(field(fd, "test"), field(fd, "conversation")));
}
