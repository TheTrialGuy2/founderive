import { kindOf, type Kind } from "../store/schemas";

export type LinkField = "relatedTests" | "relatedConversations" | "evidence" | "relatedTest";
export type Link = { field: LinkField; target: string; expect: Kind | null };
export type BrokenLink = Link & { problem: "missing" | "wrong-kind" };

const FILE_NAMES: Partial<Record<Kind, string>> = {
  test: "a test file name (tests/YYYY-MM-DD-name.md)",
  conversation: "a conversation file name (conversations/YYYY-MM-DD-name.md)",
};

/** The links a record makes to other records, with the kind each target must be (null: any record). */
export function linksOf(kind: Kind, data: object): Link[] {
  const d = data as Partial<Record<LinkField, string | string[] | null>>;
  const list = (field: LinkField, expect: Kind | null): Link[] => {
    const v = d[field];
    const targets = Array.isArray(v) ? v : v ? [v] : [];
    return targets.map((target) => ({ field, target, expect }));
  };
  if (kind === "conversation") return list("relatedTests", "test");
  if (kind === "test") return list("relatedConversations", "conversation");
  if (kind === "decision") return [...list("evidence", null), ...list("relatedTest", "test")];
  return [];
}

/** Links whose target isn't in founder-data or is the wrong kind of record. The parent record is never dropped for these. */
export function brokenLinks(links: Link[], exists: (rel: string) => boolean): BrokenLink[] {
  return links.flatMap((l): BrokenLink[] => {
    if (l.expect && kindOf(l.target) !== l.expect) return [{ ...l, problem: "wrong-kind" }];
    if (!exists(l.target)) return [{ ...l, problem: "missing" }];
    return [];
  });
}

export function describeBrokenLink(b: BrokenLink): string {
  if (b.problem === "wrong-kind" && b.expect) return `${b.field}: ${b.target} isn't ${FILE_NAMES[b.expect] ?? `a ${b.expect} file`}`;
  return `${b.field}: ${b.target} isn't in founder-data`;
}
