import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PanelHome } from "./protocol";

export type Home = PanelHome & { cwd: string; data: string | null };

/** The program's working directory: the founder's record once setup is complete, the repo root before that. `data` is the resolved data folder whenever one exists, even in repo mode. */
export function panelHome(input: { repo: string; data: string | null; setupComplete: boolean }): Home {
  if (input.data && input.setupComplete) return { cwd: input.data, mode: "record", name: path.basename(input.data), data: input.data };
  return { cwd: input.repo, mode: "repo", name: path.basename(input.repo), data: input.data };
}

/** `//` is Claude Code's spelling of an absolute path in a permission rule (a single slash anchors to the settings file). */
const absoluteRule = (p: string) => `/${p}`;

/** Repo folders that are the app itself; a data folder inside any of them is refused. */
const APP_FOLDERS = ["web", ".git", ".claude", "docs", "starter-data"];

/** The path segments of `child` under `parent` ([] when they're the same folder), or null when `child` isn't inside `parent`. */
function segmentsWithin(parent: string, child: string): string[] | null {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  if (rel === "") return [];
  if (path.isAbsolute(rel)) return null;
  const segments = rel.split(path.sep);
  return segments[0] === ".." ? null : segments;
}

/**
 * Whether the panel may treat `data` as the founder's data folder: not the repo itself, not a folder that contains the
 * repo, and not inside one of the app's own folders. Outside the repo, or inside it under another path, is fine.
 */
export function dataFolderIsSafe(repo: string, data: string): boolean {
  const inRepo = segmentsWithin(repo, data);
  if (inRepo) return inRepo.length > 0 && !APP_FOLDERS.includes(inRepo[0].toLowerCase());
  return segmentsWithin(data, repo) === null;
}

export type DirEntry = { name: string; isDirectory: boolean };
/** One folder on the way from the repo to the data folder: every entry is denied except `keep` (the next step down). */
export type DenyLevel = { dir: string; entries: DirEntry[]; keep: string | null };

/**
 * Deny rules, level by level: at each folder, every entry except the one leading to the data folder. A folder that
 * keeps nothing is also denied as a whole, so new files there are covered too. Files and folders follow the real
 * entry type. Then no git push.
 */
export function denyRules(_repo: string, levels: DenyLevel[]): string[] {
  const deny: string[] = [];
  for (const { dir, entries, keep } of levels) {
    for (const { name, isDirectory } of entries) {
      if (name === keep) continue;
      const target = absoluteRule(path.join(dir, name));
      deny.push(isDirectory ? `Edit(${target}/**)` : `Edit(${target})`);
    }
    if (keep === null) deny.push(`Edit(${absoluteRule(path.resolve(dir))}/**)`);
  }
  deny.push("Bash(git push *)", "Bash(git push:*)");
  return deny;
}

/** The settings file's text for a set of deny rules. */
export function claudeSettingsFor(rules: string[]): string {
  return `${JSON.stringify({ permissions: { deny: rules } }, null, 2)}\n`;
}

let settingsDir: string | null = null;

/** One temp folder per process, created on first use and reused after. */
async function launchSettingsDir(): Promise<string> {
  settingsDir ??= await mkdtemp(path.join(os.tmpdir(), "founderive-panel-"));
  return settingsDir;
}

async function dirEntries(dir: string): Promise<DirEntry[] | null> {
  try {
    return (await readdir(dir, { withFileTypes: true })).map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT" || (err as NodeJS.ErrnoException).code === "ENOTDIR") return null;
    throw err;
  }
}

/** The levels from the repo down to the data folder. A data folder outside the repo, unsafe, or null: the repo's top level, nothing kept. */
export async function denyLevels(repo: string, data: string | null): Promise<DenyLevel[]> {
  const segments = data && dataFolderIsSafe(repo, data) ? segmentsWithin(repo, data) : null;
  if (!segments) return [{ dir: repo, entries: (await dirEntries(repo)) ?? [], keep: null }];
  const levels: DenyLevel[] = [];
  let dir = repo;
  for (const keep of segments) {
    const entries = await dirEntries(dir);
    if (!entries) break; // the rest of the way doesn't exist yet; nothing below it to deny
    levels.push({ dir, entries, keep });
    dir = path.join(dir, keep);
  }
  return levels;
}

/**
 * Writes the launch settings to this process's temp folder (overwriting any previous launch's) and returns the file's
 * path. Only the data folder is spared, and only when `dataFolderIsSafe`; the settings folder itself is denied too.
 */
export async function writeLaunchSettings(repo: string, data: string | null): Promise<string> {
  const dir = await launchSettingsDir();
  // The OS can clean a temp folder out from under a long-running process; recreate it if it's gone.
  await mkdir(dir, { recursive: true });
  const rules = denyRules(repo, await denyLevels(repo, data));
  const settingsRules = new Set([`Edit(${absoluteRule(dir)}/**)`, `Edit(${absoluteRule(await realpath(dir))}/**)`]);
  rules.splice(rules.length - 2, 0, ...settingsRules);
  const file = path.join(dir, "claude-settings.json");
  await writeFile(file, claudeSettingsFor(rules), "utf8");
  return file;
}

/** Removes this process's launch-settings folder, if one was created. */
export async function removeLaunchSettings(): Promise<void> {
  if (settingsDir) await rm(settingsDir, { recursive: true, force: true });
  settingsDir = null;
}

/** Claude Code's extra arguments: the repo as an added directory when home is the record, and the settings file always. */
export function claudeArgs(home: Home, repo: string, settingsFile: string): string[] {
  return [...(home.mode === "record" ? ["--add-dir", repo] : []), "--settings", settingsFile];
}

/** Quotes one argument for `sh -c`. */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
