import { describe, expect, it } from "vitest";
import { FEEDBACK_EMAIL, feedbackLinks, feedbackText, routePattern } from "./feedback";

const input = { whatHappened: "Saving a test showed an error", page: "/tests/new", expected: "The test to save" };

describe("feedback links", () => {
  it("addresses the email to the one shipped address, with page and version filled in", () => {
    const url = new URL(feedbackLinks(input, "0.1.0").mailto);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(FEEDBACK_EMAIL);
    expect(url.searchParams.get("subject")).toBe("Founderive feedback: /tests/new");
    expect(url.searchParams.get("body")).toBe(feedbackText(input, "0.1.0"));
  });
  it("opens a prefilled GitHub issue", () => {
    const url = new URL(feedbackLinks(input, "0.1.0").issue);
    expect(`${url.origin}${url.pathname}`).toBe("https://github.com/TheTrialGuy2/founderive/issues/new");
    expect(url.searchParams.get("title")).toBe("Saving a test showed an error");
    expect(url.searchParams.get("body")).toContain("App version: 0.1.0");
  });
  it("includes only what the tester typed, the page and the version", () => {
    expect(feedbackText(input, "0.1.0")).toBe("What happened: Saving a test showed an error\nPage: /tests/new\nWhat I expected: The test to save\nApp version: 0.1.0");
  });
  it("shortens a long issue title", () => {
    expect(new URL(feedbackLinks({ ...input, whatHappened: "x".repeat(80) }, "0.1.0").issue).searchParams.get("title")).toHaveLength(58);
  });
});

describe("routePattern (feedback never carries a record's name)", () => {
  it.each([
    ["/conversations/2026-10-08-dana-ortiz", "/conversations/…"],
    ["/tests/2026-10-06-paid-pilot", "/tests/…"],
    ["/canvas/customer", "/canvas/…"],
    ["/tests/2026-10-06-paid-pilot?tab=evidence#x", "/tests/…"],
    ["/conversations/a/b", "/conversations/…/…"],
    ["/some-unknown-page", "/…"],
    ["/path/problem", "/path/…"],
  ])("%s becomes %s", (path, pattern) => expect(routePattern(path)).toBe(pattern));
  it.each(["/today", "/tests", "/tests/new", "/conversations/new", "/import/folder", "/setup", "/feedback", "/decisions", "/", "/people", "/logged", "/path/you"])("keeps the static route %s", (path) =>
    expect(routePattern(path)).toBe(path));
  it("never lets a dynamic segment reach the email, the issue or the text", () => {
    const leaky = { ...input, page: "/conversations/2026-10-08-dana-ortiz" };
    const links = feedbackLinks(leaky, "0.1.0");
    for (const s of [decodeURIComponent(links.mailto), decodeURIComponent(links.issue), feedbackText(leaky, "0.1.0")]) {
      expect(s).not.toContain("dana");
      expect(s).not.toContain("2026-10-08");
    }
    expect(feedbackText(leaky, "0.1.0")).toContain("Page: /conversations/…");
  });
});
