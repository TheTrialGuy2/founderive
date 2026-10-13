import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initData } from "./init";
import { useTempData } from "./test-helpers";

const STARTER = fileURLToPath(new URL("../../../starter-data", import.meta.url));
const exists = (p: string) => access(p).then(() => true, () => false);

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData(false);
  process.env.FOUNDER_STARTER_DIR = STARTER;
});
afterEach(async () => {
  delete process.env.FOUNDER_STARTER_DIR;
  await env.cleanup();
});

describe("initData", () => {
  it("creates founder-data from the starter, keeping files already there", async () => {
    await mkdir(path.join(env.dir, "_reference"), { recursive: true });
    await writeFile(path.join(env.dir, "_reference/notes.md"), "mine");
    const result = await initData();
    expect(result.status).toBe("created");
    expect(await exists(path.join(env.dir, "founder.md"))).toBe(true);
    expect(await readFile(path.join(env.dir, "_reference/notes.md"), "utf8")).toBe("mine");
    expect(["committed", "commit-failed", "unavailable"]).toContain(result.git);
  });
  it("does nothing when founder.md already exists", async () => {
    await initData();
    const second = await initData();
    expect(second.status).toBe("exists");
  });
});
