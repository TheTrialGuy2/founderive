import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./paths";

// Folders that hold history or private reference material, never live entries.
const SKIP_DIRS = new Set(["_archive", "_reference", "node_modules"]);

/** All .md files in founder-data as sorted, forward-slash relative paths. Empty if the folder doesn't exist. */
export async function walkMarkdown(): Promise<string[]> {
  const root = dataDir();
  const found: string[] = [];
  async function visit(dir: string) {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await visit(abs);
      } else if (entry.name.endsWith(".md")) {
        found.push(path.relative(root, abs).split(path.sep).join("/"));
      }
    }
  }
  await visit(root);
  return found.sort();
}
