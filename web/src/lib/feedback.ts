// The one shipped address for beta feedback (spec §0). Change it here only.
export const FEEDBACK_EMAIL = "hello@founderive.com";
export const ISSUES_URL = "https://github.com/TheTrialGuy2/founderive/issues/new";

export type FeedbackInput = { whatHappened: string; page: string | null; expected: string | null };

// The app's routes with no dynamic segment. Anything else has a record's slug (a person's name, a test's title) in it.
// /path/you is static; any other /path/<step> reports as /path/….
const STATIC_ROUTES = new Set(["/", "/today", "/tests", "/tests/new", "/conversations", "/conversations/new", "/canvas", "/decisions", "/feedback", "/import", "/import/folder", "/setup", "/people", "/logged", "/path/you"]);
const TOP_LEVEL = new Set([...STATIC_ROUTES].map((r) => r.split("/")[1]).filter(Boolean));

/**
 * The route pattern of an app path, never the path itself: `/conversations/2026-10-08-dana` becomes `/conversations/…`
 * (the same for tests, canvas blocks and any dynamic segment). Query and hash are dropped. An unknown page is `/…`.
 */
export function routePattern(pathname: string): string {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (STATIC_ROUTES.has(path)) return path;
  const [top, ...rest] = path.split("/").filter(Boolean);
  if (!top || !TOP_LEVEL.has(top)) return "/…";
  return `/${[top, ...rest.map(() => "…")].join("/")}`;
}

/** What the page field becomes in anything sent or saved: an app path is reduced to its route pattern; other text stays. */
const pageOf = (page: string | null) => (page?.startsWith("/") ? routePattern(page) : page);

/** The message: only what the tester typed, the page and the app version. Nothing from founder-data is added. */
export function feedbackText(input: FeedbackInput, version: string): string {
  return [`What happened: ${input.whatHappened}`, `Page: ${pageOf(input.page) ?? "not given"}`, `What I expected: ${input.expected ?? "not given"}`, `App version: ${version}`].join("\n");
}

/** A pre-addressed email draft and a prefilled GitHub issue carrying the same text. */
export function feedbackLinks(input: FeedbackInput, version: string): { mailto: string; issue: string } {
  const body = feedbackText(input, version);
  const subject = `Founderive feedback: ${pageOf(input.page) ?? "general"}`;
  const title = input.whatHappened.length > 60 ? `${input.whatHappened.slice(0, 57)}…` : input.whatHappened;
  return {
    mailto: `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    issue: `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`,
  };
}
