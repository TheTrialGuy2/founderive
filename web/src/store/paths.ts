import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export class OutsideDataDirError extends Error {}

const INVALID_CONFIG_MESSAGE = 'founderive.local.json is invalid: expected { "dataDir": "/path/to/your/data" }';

/** Repo root, resolved from process.cwd() the same way the founder-data default always has (cwd is web/ for next and scripts). */
function repoRoot(): string {
  return path.resolve(process.cwd(), "..");
}

function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(os.homedir(), p.slice(2));
  return p;
}

/** Path to the local settings file. Overridable so tests don't depend on the real repo root. */
function localConfigPath(): string {
  return process.env.FOUNDERIVE_LOCAL_CONFIG ?? path.join(repoRoot(), "founderive.local.json");
}

/** Reads founderive.local.json, if present. Synchronous: it's a tiny file read on every dataDir() call so tests can switch it. */
function configuredDataDir(): string | null {
  const configPath = localConfigPath();
  if (!fs.existsSync(configPath)) return null;

  const raw = fs.readFileSync(configPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(INVALID_CONFIG_MESSAGE);
  }
  if (typeof parsed !== "object" || parsed === null || typeof (parsed as Record<string, unknown>).dataDir !== "string") {
    throw new Error(INVALID_CONFIG_MESSAGE);
  }

  const configured = expandHome((parsed as { dataDir: string }).dataDir);
  return path.isAbsolute(configured) ? configured : path.join(repoRoot(), configured);
}

/**
 * Where the founder's files live. Resolution order:
 * 1. env FOUNDER_DATA_DIR
 * 2. founderive.local.json at the repo root → { "dataDir": "<path>" } (supports ~/ and relative paths)
 * 3. default: <repo root>/founder-data
 * Read on every call (nothing cached) so tests and settings changes take effect immediately.
 */
export function dataDir(): string {
  if (process.env.FOUNDER_DATA_DIR) return path.resolve(process.env.FOUNDER_DATA_DIR);
  const configured = configuredDataDir();
  if (configured) return path.resolve(configured);
  return path.resolve(repoRoot(), "founder-data");
}

/** Resolves a founder-data-relative path, refusing anything that escapes the folder. */
export function resolveInData(rel: string): string {
  const root = dataDir();
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new OutsideDataDirError(`Path escapes founder-data: ${rel}`);
  return abs;
}

/** Where the starter template lives. Defaults to ../starter-data relative to web/. */
export function starterDir(): string {
  return path.resolve(process.env.FOUNDER_STARTER_DIR ?? path.join(process.cwd(), "..", "starter-data"));
}
