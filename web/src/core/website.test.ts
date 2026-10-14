import { describe, expect, it } from "vitest";
import { websiteHref } from "./website";

describe("websiteHref", () => {
  it("returns null for empty, missing or whitespace-only input", () => {
    expect(websiteHref(null)).toBeNull();
    expect(websiteHref(undefined)).toBeNull();
    expect(websiteHref("")).toBeNull();
    expect(websiteHref("   ")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(websiteHref("  www.lantern.app  ")).toBe("https://www.lantern.app");
  });

  it("prefixes https:// when there's no scheme", () => {
    expect(websiteHref("www.lantern.app")).toBe("https://www.lantern.app");
    expect(websiteHref("lantern.app")).toBe("https://lantern.app");
  });

  it("keeps an existing http or https scheme as-is", () => {
    expect(websiteHref("http://lantern.app")).toBe("http://lantern.app");
    expect(websiteHref("https://lantern.app/pricing")).toBe("https://lantern.app/pricing");
  });

  it("refuses a non-http(s) scheme", () => {
    expect(websiteHref("ftp://lantern.app")).toBeNull();
    expect(websiteHref("javascript:alert(1)")).toBeNull();
    expect(websiteHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(websiteHref("mailto:sam@lantern.app")).toBeNull();
  });

  it("refuses text that still isn't a URL once https:// is prefixed", () => {
    expect(websiteHref("not a url with spaces")).toBeNull();
  });
});
