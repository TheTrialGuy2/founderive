import { describe, expect, it } from "vitest";
import { KINDS } from "../store/schemas";
import { datedPath, hrefFor, pathForSlug, slugify, slugOf } from "./slug";

describe("slugify", () => {
  it("lowercases and joins words with single hyphens", () => expect(slugify("Dana Ortiz — Bright Home Care!")).toBe("dana-ortiz-bright-home-care"));
  it("drops accents", () => expect(slugify("Café owners")).toBe("cafe-owners"));
  it("never returns an empty slug", () => expect(slugify("!!!")).toBe("entry"));
  it("cuts long titles at a word boundary", () =>
    expect(slugify("Ask agency owners to pay for a scheduling pilot at two hundred dollars")).toBe("ask-agency-owners-to-pay-for-a-scheduling-pilot"));
  it("cuts a single long word at the limit", () => expect(slugify("a".repeat(60))).toBe("a".repeat(48)));
});

describe("datedPath", () => {
  it("builds a path the store accepts, numbering repeats", () => {
    expect(datedPath("conversations", "2026-10-08", "Dana Ortiz")).toBe("conversations/2026-10-08-dana-ortiz.md");
    expect(datedPath("conversations", "2026-10-08", "Dana Ortiz", 2)).toBe("conversations/2026-10-08-dana-ortiz-2.md");
    expect(KINDS.conversation.pattern.test(datedPath("conversations", "2026-10-08", "Dana Ortiz", 3))).toBe(true);
    expect(KINDS.test.pattern.test(datedPath("tests", "2026-10-06", "¿Pagarán?"))).toBe(true);
  });
  it("refuses an impossible date", () => expect(() => datedPath("tests", "2026-99-99", "Pilot")).toThrow(/real date/));
});

describe("slugs, paths and pages", () => {
  it("round-trips a slug", () => {
    expect(slugOf("tests/2026-10-06-paid-pilot.md")).toBe("2026-10-06-paid-pilot");
    expect(pathForSlug("tests", "2026-10-06-paid-pilot")).toBe("tests/2026-10-06-paid-pilot.md");
  });
  it("refuses a slug that isn't a dated entry name", () => {
    expect(pathForSlug("tests", "../founder")).toBeNull();
    expect(pathForSlug("tests", "..%2Ffounder")).toBeNull();
    expect(pathForSlug("tests", "paid-pilot")).toBeNull();
    expect(pathForSlug("tests", "2026-99-99-paid-pilot")).toBeNull();
  });
  it("links a record path to its page", () => {
    expect(hrefFor("conversations/2026-10-08-dana-ortiz.md")).toBe("/conversations/2026-10-08-dana-ortiz");
    expect(hrefFor("tests/2026-10-06-paid-pilot.md")).toBe("/tests/2026-10-06-paid-pilot");
    expect(hrefFor("decisions/2026-10-09-focus.md")).toBe("/decisions");
    expect(hrefFor("canvas/customer.md")).toBe("/canvas/customer");
    expect(hrefFor("founder.md")).toBe("/setup");
    expect(hrefFor("notes/scratch.md")).toBeNull();
  });
});
