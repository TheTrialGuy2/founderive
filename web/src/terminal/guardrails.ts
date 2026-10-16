import { mkdir, mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { realPathOf } from "../store/paths";
import type { PanelHome } from "./protocol";

/**
 * `refused` is the data folder setting that was refused, only in `unsafe` mode. `exists` says whether the data folder
 * is there yet: a missing one is created on Start (`command`), never when the home is only being looked at.
 */
export type Home = PanelHome & { cwd: string; data: string | null; exists: boolean; refused?: string };

/**
 * Where the program runs. Always the data folder: `record` once setup is complete, `setup` before that. A data folder
 * that fails `dataFolderIsSafe` is `unsafe`: nothing starts, and `cwd` is the repo only so the state has a name to show.
 */
export function panelHome(input: { repo: string; data: string; safe: boolean; exists: boolean; setupComplete: boolean }): Home {
  if (!input.safe) return { cwd: input.repo, mode: "unsafe", name: path.basename(input.repo), data: null, exists: false, refused: input.data };
  return { cwd: input.data, mode: input.exists && input.setupComplete ? "record" : "setup", name: path.basename(input.data), data: input.data, exists: input.exists };
}

/** What the panel says when the data folder setting is refused. */
export function unsafeDataFolderMessage(dir: string): string {
  return `The data folder setting is the Founderive app folder, is inside it, or contains it (${dir}). Move it outside the app folder, or use founder-data/, then start again.`;
}

/** `//` is Claude Code's spelling of an absolute path in a permission rule (a single slash anchors to the settings file). */
const absoluteRule = (p: string) => `/${p}`;

/**
 * Root files denied by name even when they don't exist yet, so Claude's file tools can't create them. The one that
 * matters most is founderive.local.json: creating it would move the data folder on the next start.
 */
export const ROOT_FILES = ["founderive.local.json", "CLAUDE.md", "AGENTS.md", "start.mjs", "package.json", "README.md"];

export type DirEntry = { name: string; isDirectory: boolean };

const GIT_PUSH = ["Bash(git push *)", "Bash(git push:*)"];

/**
 * The deny rules for the repo, in one of two shapes (`dataFolderIsSafe` allows nothing else):
 *
 * - Data folder outside the repo (`rootEntries` null): the whole repo, `Edit(//<repo>/**)`.
 * - Data folder at `<repo>/founder-data` (`rootEntries` = the repo's top-level entries): every existing top-level
 *   entry except founder-data (folders as `/**`, files exactly), the `ROOT_FILES` by name whether or not they exist,
 *   and `Edit(//<repo>/*.*)` for any new root file with a dot in its name (founder-data has none).
 *
 * Why not `Edit(//<repo>/*)` for every root file: Read and Edit rules use gitignore syntax
 * (https://code.claude.com/docs/en/permissions#read-and-edit). The docs say `*` matches within a single path segment,
 * but under gitignore semantics a pattern that matches a folder also covers everything inside it, so `<repo>/*` matches
 * `<repo>/founder-data` and denies the whole record. Checked against Claude Code itself: with that one rule, a Write to
 * `founder-data/note.md` was denied; with the explicit rules, it succeeded and root/web writes were denied.
 *
 * Not covered by these rules: a new top-level folder, or a new root file without a dot in its name and not in
 * `ROOT_FILES`, created after launch. The PreToolUse hook (`web/scripts/panel-guard.mjs`, see `guardHook`) closes that:
 * it refuses any Edit, Write or NotebookEdit inside the repo but outside the data folder. Then no git push.
 */
export function denyRules(repo: string, rootEntries: DirEntry[] | null): string[] {
  const root = absoluteRule(repo);
  if (rootEntries === null) return [`Edit(${root}/**)`, ...GIT_PUSH];
  const deny = new Set<string>();
  for (const { name, isDirectory } of rootEntries) {
    if (name === "founder-data") continue;
    deny.add(isDirectory ? `Edit(${root}/${name}/**)` : `Edit(${root}/${name})`);
  }
  for (const name of ROOT_FILES) deny.add(`Edit(${root}/${name})`);
  deny.add(`Edit(${root}/*.*)`);
  return [...deny, ...GIT_PUSH];
}

/**
 * The PreToolUse hook that runs `web/scripts/panel-guard.mjs` before every Edit, Write, NotebookEdit and MultiEdit, in
 * every permission mode. The script refuses a path inside the repo that isn't inside the data folder, and the settings
 * folder. It only sees Claude's file tools, not shell commands. Every path is shell-quoted, including the node
 * binary's own path (`process.execPath`), so the hook runs the server's own node rather than depending on the shell's
 * PATH having one. The script lives under `web/`, which the deny rules cover, so the agent can't change it.
 */
export function guardHook(paths: { repo: string; data: string | null; settings: string }) {
  const env = [`FOUNDERIVE_GUARD_REPO=${shellQuote(paths.repo)}`];
  // No data folder (never the case at launch; `command` refuses unsafe homes): the whole repo is refused.
  if (paths.data !== null) env.push(`FOUNDERIVE_GUARD_DATA=${shellQuote(paths.data)}`);
  env.push(`FOUNDERIVE_GUARD_SETTINGS=${shellQuote(paths.settings)}`);
  const script = shellQuote(path.join(paths.repo, "web", "scripts", "panel-guard.mjs"));
  // The server's own node (process.execPath), not a bare `node`: the hook can't depend on the shell's PATH, where a
  // missing `node` would exit 127 and silently fail to block anything.
  const node = shellQuote(process.execPath);
  return { PreToolUse: [{ matcher: "Edit|Write|NotebookEdit|MultiEdit", hooks: [{ type: "command", command: `${env.join(" ")} ${node} ${script}` }] }] };
}

/** The settings file's text for a set of deny rules and, optionally, the guard hook. */
export function claudeSettingsFor(rules: string[], hooks?: ReturnType<typeof guardHook>): string {
  return `${JSON.stringify({ permissions: { deny: rules }, ...(hooks ? { hooks } : {}) }, null, 2)}\n`;
}

let settingsDir: string | null = null;

/** One temp folder per process, created on first use and reused after. */
async function launchSettingsDir(): Promise<string> {
  settingsDir ??= await mkdtemp(path.join(os.tmpdir(), "founderive-panel-"));
  return settingsDir;
}

async function dirEntries(dir: string): Promise<DirEntry[]> {
  return (await readdir(dir, { withFileTypes: true })).map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
}

/**
 * Writes the launch settings to this process's temp folder (overwriting any previous launch's) and returns the file's
 * path. Only `<repo>/founder-data` is ever spared, and only when `data` is exactly that folder (on the real paths);
 * any other `data`, or null, gets the whole repo denied. Rules are written for the repo as given and, when it differs,
 * its real path. The settings folder itself is denied too. The guard hook (`guardHook`) is added on the real paths.
 */
export async function writeLaunchSettings(repo: string, data: string | null): Promise<string> {
  const dir = await launchSettingsDir();
  // The OS can clean a temp folder out from under a long-running process; recreate it if it's gone.
  await mkdir(dir, { recursive: true });
  const realRepo = realPathOf(repo);
  const inRepo = data !== null && realPathOf(data) === path.join(realRepo, "founder-data");
  const entries = inRepo ? await dirEntries(realRepo) : null;
  const rules = new Set<string>();
  for (const spelling of new Set([path.resolve(repo), realRepo])) {
    for (const rule of denyRules(spelling, entries)) if (!GIT_PUSH.includes(rule)) rules.add(rule);
  }
  const realDir = await realpath(dir);
  rules.add(`Edit(${absoluteRule(dir)}/**)`);
  rules.add(`Edit(${absoluteRule(realDir)}/**)`);
  const hooks = guardHook({ repo: realRepo, data: data === null ? null : realPathOf(data), settings: realDir });
  const file = path.join(dir, "claude-settings.json");
  await writeFile(file, claudeSettingsFor([...rules, ...GIT_PUSH], hooks), "utf8");
  return file;
}

/** Removes this process's launch-settings folder, if one was created. */
export async function removeLaunchSettings(): Promise<void> {
  if (settingsDir) await rm(settingsDir, { recursive: true, force: true });
  settingsDir = null;
}

/** Claude Code's extra arguments: the repo as an added directory (it's never the working directory) and the settings file. */
export function claudeArgs(repo: string, settingsFile: string): string[] {
  return ["--add-dir", repo, "--settings", settingsFile];
}

/** Quotes one argument for `sh -c`. */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
