import { readEntry } from "./read";
import { kindOf } from "./schemas";
import { walkMarkdown } from "./walk";

export type CheckReport = { checked: number; errors: { path: string; error: string }[]; unknown: string[] };

/** Validates every Markdown file in founder-data. Unknown kinds are listed, not failed. */
export async function checkData(): Promise<CheckReport> {
  const rels = await walkMarkdown();
  const errors: CheckReport["errors"] = [];
  const unknown: string[] = [];
  for (const rel of rels) {
    const kind = kindOf(rel);
    if (!kind) {
      unknown.push(rel);
      continue;
    }
    const entry = await readEntry(kind, rel);
    if (entry && !entry.ok) errors.push({ path: rel, error: entry.error });
  }
  return { checked: rels.length, errors, unknown };
}
