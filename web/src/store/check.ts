import { brokenLinks, describeBrokenLink, linksOf } from "../core/links";
import { readEntry } from "./read";
import { kindOf } from "./schemas";
import { walkMarkdown } from "./walk";

export type CheckReport = {
  checked: number;
  errors: { path: string; error: string }[];
  warnings: { path: string; warning: string }[];
  misnamed: string[];
  unknown: string[];
};

// Folders that hold Founderive records, and the file names each one expects. A .md file here that matches no kind
// is a warning (usually a typo in the name), never silently valid.
const FOLDER_NAMES: Record<string, string> = {
  checkins: "checkins/YYYY-Www.md",
  program: "program/week-NN.md",
  canvas: "canvas/<id>.md (lowercase letters, digits and hyphens) or canvas/blocks.md",
  conversations: "conversations/YYYY-MM-DD-name.md",
  tests: "tests/YYYY-MM-DD-name.md",
  decisions: "decisions/YYYY-MM-DD-name.md",
  feedback: "feedback/YYYY-MM-DD-name.md",
};

/** Validates every Markdown file in founder-data. Misnamed files in known folders are warnings; other unknown files are listed. */
export async function checkData(): Promise<CheckReport> {
  const rels = await walkMarkdown();
  const present = new Set(rels);
  const errors: CheckReport["errors"] = [];
  const warnings: CheckReport["warnings"] = [];
  const misnamed: string[] = [];
  const unknown: string[] = [];
  for (const rel of rels) {
    const kind = kindOf(rel);
    if (!kind) {
      const folder = rel.includes("/") ? rel.slice(0, rel.indexOf("/")) : "";
      const expected = FOLDER_NAMES[folder];
      if (expected) {
        misnamed.push(rel);
        warnings.push({ path: rel, warning: `Founderive ignores this file: names in ${folder}/ look like ${expected}` });
      } else unknown.push(rel);
      continue;
    }
    const entry = await readEntry(kind, rel);
    if (!entry) continue;
    if (!entry.ok) {
      errors.push({ path: rel, error: entry.error });
      continue;
    }
    // A broken link is a warning; the record itself is still valid and still shown (amendment §13).
    for (const b of brokenLinks(linksOf(kind, entry.data), (r) => present.has(r))) warnings.push({ path: rel, warning: describeBrokenLink(b) });
  }
  return { checked: rels.length, errors, warnings, misnamed, unknown };
}
