import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("allows a path step page", () => {
    expect(safeReturnTo("/path/problem")).toBe("/path/problem");
    expect(safeReturnTo("/path/startup-needs")).toBe("/path/startup-needs");
  });
  it("refuses anything else", () => {
    for (const v of ["", "/today", "https://example.com", "//evil.com", "/path/../x", "/path/Problem", "/path/a/b"]) expect(safeReturnTo(v)).toBeNull();
  });
});
