import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PanelHome } from "./protocol";

export type Home = PanelHome & { cwd: string };

/** The program's working directory: the founder's record once setup is complete, the repo root before that. */
export function panelHome(input: { repo: string; data: string | null; setupComplete: boolean }): Home {
  if (input.data && input.setupComplete) return { cwd: input.data, mode: "record", name: path.basename(input.data) };
  return { cwd: input.repo, mode: "repo", name: path.basename(input.repo) };
}

/** `//` is Claude Code's spelling of an absolute path in a permission rule (a single slash anchors to the settings file). */
const absoluteRule = (p: string) => `/${p}`;

/**
 * Claude Code settings for one launch: no edits under any of the repo's entries except the ones to keep (the data
 * folder when it lives inside the repo, and the local settings file), and no git push.
 */
export function claudeSettings(repo: string, entries: { name: string; isDirectory: boolean }[], keep: string[]): string {
  const kept = new Set(keep);
  const deny = entries
    .filter(({ name }) => !kept.has(name))
    .map(({ name, isDirectory }) => (isDirectory ? `Edit(${absoluteRule(path.join(repo, name))}/**)` : `Edit(${absoluteRule(path.join(repo, name))})`));
  deny.push("Bash(git push *)", "Bash(git push:*)");
  return `${JSON.stringify({ permissions: { deny } }, null, 2)}\n`;
}

/** Writes the launch settings to a fresh temp folder and returns the file's path. The data folder is never denied. */
export async function writeLaunchSettings(repo: string, data: string): Promise<string> {
  const entries = (await readdir(repo, { withFileTypes: true })).map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  const relative = path.relative(repo, data);
  const dataTop = relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative.split(path.sep)[0] : null;
  const keep = ["founderive.local.json", ...(dataTop ? [dataTop] : [])];
  const dir = await mkdtemp(path.join(os.tmpdir(), "founderive-panel-"));
  const file = path.join(dir, "claude-settings.json");
  await writeFile(file, claudeSettings(repo, entries, keep), "utf8");
  return file;
}

/** Claude Code's extra arguments: the repo as an added directory when home is the record, and the settings file always. */
export function claudeArgs(home: Home, repo: string, settingsFile: string): string[] {
  return [...(home.mode === "record" ? ["--add-dir", repo] : []), "--settings", settingsFile];
}

/** Quotes one argument for `sh -c`. */
export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
