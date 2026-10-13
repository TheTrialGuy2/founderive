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
      // Put back what was there (the run's sandbox, see test-setup.ts); never unset it, so a write that lands after
      // cleanup still stays out of the founder's folder.
      if (previous !== undefined) process.env.FOUNDER_DATA_DIR = previous;
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/** Removes the loop records so a test starts from a known state, whatever the fixture holds. */
export async function clearLoopRecords(dir: string): Promise<void> {
  for (const sub of ["conversations", "tests", "decisions", "feedback"]) await rm(path.join(dir, sub), { recursive: true, force: true });
}
