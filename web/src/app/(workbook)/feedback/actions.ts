"use server";

import { parseFeedbackForm, saveFeedback } from "@/commands/feedback";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { APP_VERSION } from "@/lib/app-version";
import { feedbackLinks, feedbackText } from "@/lib/feedback";

export async function sendFeedbackAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseFeedbackForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answer.", errors: parsed.errors, values: parsed.values };
  const links = { ...feedbackLinks(parsed.input, APP_VERSION), text: feedbackText(parsed.input, APP_VERSION) };
  let path = "";
  try {
    path = await saveFeedback(parsed.input, await loadFounderToday(), APP_VERSION);
  } catch (error) {
    const why = error instanceof Error ? error.message : "unknown error";
    return { status: "error", message: `Couldn't save a local copy (${why}). You can still send it.`, values: parsed.values, result: links };
  }
  return { status: "saved", result: { ...links, path } };
}
