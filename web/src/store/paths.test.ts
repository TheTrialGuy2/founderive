import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dataDir, OutsideDataDirError, resolveInData } from "./paths";
import { useTempData } from "./test-helpers";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData(false)));
afterEach(() => env.cleanup());

describe("resolveInData", () => {
  it("uses FOUNDER_DATA_DIR", () => {
    expect(dataDir()).toBe(path.resolve(env.dir));
  });
  it("resolves paths inside the data dir", () => {
    expect(resolveInData("program/week-01.md")).toBe(path.join(env.dir, "program/week-01.md"));
  });
  it.each(["../escape.md", "a/../../escape.md", "/etc/passwd"])("rejects %s", (rel) => {
    expect(() => resolveInData(rel)).toThrow(OutsideDataDirError);
  });
});
