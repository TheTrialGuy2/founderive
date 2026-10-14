import { canvasBlocks } from "../core/canvas";
import { looksLikeContactDetails } from "../core/privacy";
import { brokenLinks, describeBrokenLink, linksOf } from "../core/links";
import { readEntry } from "./read";
import { AREAS, kindOf, type KindData } from "./schemas";
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
  // Steps a record may link to: the founder's canvas blocks (or the shipped list) plus the seven shipped areas.
  const config = await readEntry("canvasConfig", "canvas/blocks.md");
  const steps = new Set<string>([...canvasBlocks(config?.ok ? config.data : null).map((d) => d.id), ...AREAS]);
  const errors: CheckReport["errors"] = [];
  const warnings: CheckReport["warnings"] = [];
  const unknownStep = (rel: string, field: string, id: string) =>
    warnings.push({ path: rel, warning: `${field}: "${id}" isn't a step on your canvas, so it won't show on a step page. Pick one of your steps, or add it to canvas/blocks.md.` });
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
    // The schema can't see the file name, so a check-in's week field is compared with it here. Founderive goes by the
    // file name; a field that disagrees is an error to fix by hand.
    if (kind === "checkin") {
      const fileWeek = rel.slice("checkins/".length, -".md".length);
      const week = (entry.data as KindData<"checkin">).week;
      if (week !== fileWeek) {
        errors.push({ path: rel, error: `week: says ${week}, but the file name says ${fileWeek}. Make them match.` });
        continue;
      }
    }
    // A broken link is a warning; the record itself is still valid and still shown (amendment §13).
    for (const b of brokenLinks(linksOf(kind, entry.data), (r) => present.has(r))) warnings.push({ path: rel, warning: describeBrokenLink(b) });
    if (kind === "conversation") for (const a of (entry.data as KindData<"conversation">).areas) if (!steps.has(a)) unknownStep(rel, "areas", a);
    if (kind === "test") {
      const a = (entry.data as KindData<"test">).area;
      if (!steps.has(a)) unknownStep(rel, "area", a);
    }
    if (kind === "checkin")
      for (const c of (entry.data as KindData<"checkin">).commitments) {
        const id = c.link?.startsWith("step:") ? c.link.slice("step:".length) : null;
        if (id && !steps.has(id)) unknownStep(rel, "link", id);
        // A planned conversation's text is shown on Home and the step page, so it follows the same rule as `person`.
        if (id && c.status === "open" && looksLikeContactDetails(c.text))
          warnings.push({ path: rel, warning: `commitments: "${c.id}" holds contact details. Use a first name or a role, like Dana or agency owner, in its text.` });
      }
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
