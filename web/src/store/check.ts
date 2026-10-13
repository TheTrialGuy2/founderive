import { brokenLinks, describeBrokenLink, linksOf } from "../core/links";
import { readEntry } from "./read";
import { kindOf, type KindData } from "./schemas";
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
  // Each readable test's conversations and each readable conversation's tests, to compare the two sides afterwards.
  const testLinks = new Map<string, string[]>();
  const conversationLinks = new Map<string, string[]>();
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
    if (kind === "test") testLinks.set(rel, (entry.data as KindData<"test">).relatedConversations);
    if (kind === "conversation") conversationLinks.set(rel, (entry.data as KindData<"conversation">).relatedTests);
  }
  warnings.push(...oneSidedLinks(testLinks, conversationLinks));
  return { checked: rels.length, errors, warnings, misnamed, unknown };
}

const REPAIR = "Link them again from the test page to repair.";

/**
 * Evidence links listed on only one of the two records (a link or unlink that stopped halfway, or a hand edit). Only
 * pairs where both records exist and read are compared; a missing target is already a broken-link warning.
 */
function oneSidedLinks(tests: Map<string, string[]>, conversations: Map<string, string[]>): CheckReport["warnings"] {
  const warnings: CheckReport["warnings"] = [];
  for (const [test, convs] of tests)
    for (const c of convs)
      if (conversations.has(c) && !conversations.get(c)!.includes(test))
        warnings.push({ path: test, warning: `${test} lists ${c} as evidence, but ${c} doesn't list the test. ${REPAIR}` });
  for (const [conv, ts] of conversations)
    for (const t of ts)
      if (tests.has(t) && !tests.get(t)!.includes(conv))
        warnings.push({ path: conv, warning: `${conv} lists ${t}, but ${t} doesn't list the conversation. ${REPAIR}` });
  return warnings;
}
