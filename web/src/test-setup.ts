import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";

/**
 * Runs before every test file. Tests must never reach the founder's real folder, even from a write that lands after
 * a test's own temp folder is gone, so the whole run points at a throwaway sandbox and the local settings file is
 * ignored (paths.ts also refuses to fall back while VITEST is set).
 */
const sandbox = mkdtempSync(path.join(os.tmpdir(), "founderive-sandbox-"));
process.env.FOUNDER_DATA_DIR = sandbox;
process.env.FOUNDERIVE_LOCAL_CONFIG = path.join(sandbox, "no-local-config.json");
process.env.FOUNDER_STARTER_DIR ??= fileURLToPath(new URL("../../starter-data", import.meta.url));

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));
