import { describe, expect, it } from "vitest";
import { isLogoTooBig, LOGO_MAX_BYTES, LOGO_TOO_BIG_MESSAGE } from "./logo";

describe("isLogoTooBig", () => {
  it("is false at and under the limit", () => {
    expect(isLogoTooBig(LOGO_MAX_BYTES)).toBe(false);
    expect(isLogoTooBig(LOGO_MAX_BYTES - 1)).toBe(false);
    expect(isLogoTooBig(0)).toBe(false);
  });

  it("is true over the limit", () => {
    expect(isLogoTooBig(LOGO_MAX_BYTES + 1)).toBe(true);
  });
});

describe("LOGO_TOO_BIG_MESSAGE", () => {
  it("names the limit", () => {
    expect(LOGO_TOO_BIG_MESSAGE).toMatch(/1 MB|1,000,000/);
  });
});
