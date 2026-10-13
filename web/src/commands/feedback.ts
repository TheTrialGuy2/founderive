import { routePattern, type FeedbackInput } from "../lib/feedback";
import { createDated } from "./create";
import { orNull, text, type Parsed } from "./form";

export const FEEDBACK_DIR = "feedback";

export function parseFeedbackForm(fd: FormData): Parsed<FeedbackInput> {
  const values = { whatHappened: text(fd, "whatHappened"), page: text(fd, "page"), expected: text(fd, "expected") };
  if (!values.whatHappened) return { ok: false, errors: { whatHappened: "Say what happened, in a sentence or two." }, values };
  // An app path is reduced to its route pattern, so a record's name never reaches the message or the saved copy.
  const page = values.page.startsWith("/") ? routePattern(values.page) : values.page;
  return { ok: true, values, input: { whatHappened: values.whatHappened, page: orNull(page), expected: orNull(values.expected) } };
}

/** Keeps a local copy of the feedback in founder-data/feedback/, never overwriting an earlier one. */
export async function saveFeedback(input: FeedbackInput, today: string, appVersion: string): Promise<string> {
  return createDated("feedback", FEEDBACK_DIR, today, input.whatHappened, { date: today, page: input.page, whatHappened: input.whatHappened, expected: input.expected, appVersion });
}
