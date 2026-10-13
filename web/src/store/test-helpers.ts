import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FIXTURE_DIR = fileURLToPath(new URL("../../test-data", import.meta.url));

/** Points FOUNDER_DATA_DIR at a fresh temp folder (optionally seeded from test-data/) for one test. */
export async function useTempData(withFixture = true): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "founderive-"));
  if (withFixture) await cp(FIXTURE_DIR, dir, { recursive: true });
  const previous = process.env.FOUNDER_DATA_DIR;
  process.env.FOUNDER_DATA_DIR = dir;
  return {
    dir,
    cleanup: async () => {
      if (previous === undefined) delete process.env.FOUNDER_DATA_DIR;
      else process.env.FOUNDER_DATA_DIR = previous;
      await rm(dir, { recursive: true, force: true });
    },
  };
}
