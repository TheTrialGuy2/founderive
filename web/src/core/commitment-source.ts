import { kindOf } from "../store/schemas";

/** The record kinds a commitment can come from. Steps are not one (they have `step:` and `guide:` links of their own). */
export type SourceKind = "conversation" | "test" | "decision";
/** What Home shows under a linked commitment: the words and where they go. */
export type CommitmentSource = { label: string; href: string };
/** A commitment as a source record lists it: the check-in week it lives in, and its own fields. */
export type LinkedCommitment = { week: string; id: string; text: string; due: string | null; status: "open" | "done" | "dropped"; reason: string | null };

const SOURCE_KINDS: readonly SourceKind[] = ["conversation", "test", "decision"];
const LAST = "9999-12-31";

/**
 * A commitment link that names a source record: a conversations/, tests/ or decisions/ path exactly as the file is
 * named. Anything else (guide:, step:, program/, traversal, absolute paths) is null and gets no source treatment.
 */
export function parseSourceLink(link: string | null | undefined): { kind: SourceKind; path: string } | null {
  if (!link || link.startsWith("/") || link.includes("..")) return null;
  const kind = kindOf(link);
  return kind && (SOURCE_KINDS as readonly string[]).includes(kind) ? { kind: kind as SourceKind, path: link } : null;
}

/** "From conversation with Dana", "From decision: <title>", "From test: <title>". */
export function sourceLabel(kind: SourceKind, name: string): string {
  if (kind === "conversation") return `From conversation with ${name}`;
  return `From ${kind}: ${name}`;
}

/** Open first (soonest due, undated last, then newest week), then done and dropped newest week first. Returns a copy. */
export function sortLinkedCommitments(items: LinkedCommitment[]): LinkedCommitment[] {
  const open = items.filter((c) => c.status === "open").sort((a, b) => (a.due ?? LAST).localeCompare(b.due ?? LAST) || b.week.localeCompare(a.week));
  const closed = items.filter((c) => c.status !== "open").sort((a, b) => b.week.localeCompare(a.week));
  return [...open, ...closed];
}
