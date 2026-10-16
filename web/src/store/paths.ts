import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export class OutsideDataDirError extends Error {}

const INVALID_CONFIG_MESSAGE = 'founderive.local.json is invalid: expected { "dataDir": "/path/to/your/data" }';

/** Repo root, resolved from process.cwd() the same way the founder-data default always has (cwd is web/ for next and scripts). */
export function repoRoot(): string {
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
 * Under the test runner (VITEST set) only FOUNDER_DATA_DIR counts: no settings file, no default folder, so a test can
 * never reach the founder's real data.
 */
export function dataDir(): string {
  if (process.env.FOUNDER_DATA_DIR) return path.resolve(process.env.FOUNDER_DATA_DIR);
  if (process.env.VITEST) throw new Error("Tests must set FOUNDER_DATA_DIR (see src/test-setup.ts).");
  const configured = configuredDataDir();
  if (configured) return path.resolve(configured);
  return path.resolve(repoRoot(), "founder-data");
}

/**
 * The real path of `p`: symlinks resolved and, on a case-insensitive disk, the real case. A path that doesn't exist yet
 * resolves its parent the same way and appends its name, so a symlinked parent is still seen; a symlink whose target
 * doesn't exist yet (realpath fails on it) is followed to that target.
 */
export function realPathOf(p: string, hops = 0): string {
  const abs = path.resolve(p);
  try {
    return fs.realpathSync.native(abs);
  } catch {
    // doesn't fully resolve: resolve the parent, then look at this name itself
  }
  const parent = path.dirname(abs);
  if (parent === abs || hops > 40) return abs;
  const candidate = path.join(realPathOf(parent, hops + 1), path.basename(abs));
  try {
    if (fs.lstatSync(candidate).isSymbolicLink()) return realPathOf(path.resolve(path.dirname(candidate), fs.readlinkSync(candidate)), hops + 1);
  } catch {
    // not there at all: the name as it would be created
  }
  return candidate;
}

/** Whether `child` is `parent` or inside it (both already resolved). */
function within(parent: string, child: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!path.isAbsolute(rel) && rel.split(path.sep)[0] !== "..");
}

/**
 * Whether `data` may be the founder's data folder for the app at `repo`, on the real paths (symlinks resolved): either
 * entirely outside the repo (not the repo, not inside it, not a folder that contains it), or exactly
 * `<repo>/founder-data`. Nothing else inside the repo is safe, so the deny rules never have to spare an app folder.
 */
export function dataFolderIsSafe(repo: string, data: string): boolean {
  const r = realPathOf(repo);
  const d = realPathOf(data);
  if (d === path.join(r, "founder-data")) return true;
  return !within(r, d) && !within(d, r);
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
