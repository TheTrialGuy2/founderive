// The one shipped address for beta feedback (spec §0). Change it here only.
export const FEEDBACK_EMAIL = "hello@founderive.com";
export const ISSUES_URL = "https://github.com/TheTrialGuy2/founderive/issues/new";

export type FeedbackInput = { whatHappened: string; page: string | null; expected: string | null };

/** The message: only what the tester typed, the page and the app version. Nothing from founder-data is added. */
export function feedbackText(input: FeedbackInput, version: string): string {
  return [`What happened: ${input.whatHappened}`, `Page: ${input.page ?? "not given"}`, `What I expected: ${input.expected ?? "not given"}`, `App version: ${version}`].join("\n");
}

/** A pre-addressed email draft and a prefilled GitHub issue carrying the same text. */
export function feedbackLinks(input: FeedbackInput, version: string): { mailto: string; issue: string } {
  const body = feedbackText(input, version);
  const subject = `Founderive feedback: ${input.page ?? "general"}`;
  const title = input.whatHappened.length > 60 ? `${input.whatHappened.slice(0, 57)}…` : input.whatHappened;
  return {
    mailto: `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    issue: `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`,
  };
}
