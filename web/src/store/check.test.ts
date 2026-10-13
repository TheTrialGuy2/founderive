import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkData } from "./check";
import { useTempData } from "./test-helpers";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("checkData", () => {
  it("reports invalid files and unknown files, skipping _archive", async () => {
    const report = await checkData();
    expect(report.checked).toBe(6);
    expect(report.errors.map((e) => e.path)).toEqual(["program/week-02.md", "program/week-03.md"]);
    expect(report.unknown).toEqual(["notes/scratch.md"]);
  });
});
