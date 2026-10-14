import { describe, expect, it } from "vitest";
import { appendCapped, PENDING_OUTPUT_MAX } from "./pendingOutput";

describe("appendCapped", () => {
  it("appends while under the cap", () => {
    expect(appendCapped("ab", "cd", 10)).toBe("abcd");
  });

  it("keeps exactly the cap", () => {
    expect(appendCapped("abcde", "fghij", 10)).toBe("abcdefghij");
  });

  it("drops the oldest output past the cap", () => {
    expect(appendCapped("abcdef", "ghijkl", 10)).toBe("cdefghijkl");
  });

  it("keeps the tail of a single chunk larger than the cap", () => {
    expect(appendCapped("", "0123456789xyz", 10)).toBe("3456789xyz");
  });

  it("defaults to about 200 KB", () => {
    const out = appendCapped("x".repeat(PENDING_OUTPUT_MAX), "end");
    expect(out.length).toBe(PENDING_OUTPUT_MAX);
    expect(out.endsWith("end")).toBe(true);
  });
});
