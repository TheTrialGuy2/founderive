import { describe, expect, it } from "vitest";
import { canShareWith, readinessStatus } from "./readiness";

describe("readinessStatus", () => {
  it("is supported when evidence meets the requirement", () => {
    expect(readinessStatus(3, 3)).toBe("supported");
    expect(readinessStatus(3, 5)).toBe("supported");
  });
  it("is partial with some evidence", () => {
    expect(readinessStatus(3, 1)).toBe("partial");
  });
  it("is missing with none", () => {
    expect(readinessStatus(3, 0)).toBe("missing");
  });
});

describe("canShareWith", () => {
  it("allows sharing only once enough criteria are supported", () => {
    expect(canShareWith({ minSupported: 3 }, 3)).toBe(true);
    expect(canShareWith({ minSupported: 5 }, 3)).toBe(false);
  });
});
