import { describe, expect, it } from "vitest";
import { FEEDBACK_EMAIL, feedbackLinks, feedbackText } from "./feedback";

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
