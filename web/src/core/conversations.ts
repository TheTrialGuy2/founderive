import { CUSTOMER_TYPES, type ConversationType } from "../store/schemas";
import { slugOf } from "./slug";

type Row = {
  path: string;
  data: { type: ConversationType; date?: string | null; person: string; followUps: { id: string; text: string; due?: string | null; status: "open" | "done" }[] };
};

/** Customer and prospect conversations are evidence. Mentor, investor, partner and other conversations are advice (amendment §5.3). */
export const isCustomerEvidence = (type: ConversationType): boolean => CUSTOMER_TYPES.includes(type);

/** Counts toward evidence: a customer or prospect conversation the founder has confirmed (an unconfirmed import doesn't count yet). */
export const countsAsEvidence = (c: { type: ConversationType; seeded?: boolean }): boolean => isCustomerEvidence(c.type) && !c.seeded;

type EvidenceFields = { type: ConversationType; seeded?: boolean; observedBehavior?: string | null; quotes?: string[]; numbers?: string[] };

/** The conversation records something (spec §3.1): notes in its body, what they do today, a quote or a number. */
export function hasEvidenceContent(c: EvidenceFields, notes: string): boolean {
  const some = (list: string[] | undefined) => (list ?? []).some((s) => s.trim() !== "");
  return notes.trim() !== "" || !!c.observedBehavior?.trim() || some(c.quotes) || some(c.numbers);
}

/**
 * The one evidence predicate: a confirmed customer or prospect conversation that records something. `notes` is the
 * record's body; it's required so a caller can't count a conversation without looking at what it says.
 */
export const isEvidenceEligible = (c: EvidenceFields, notes: string): boolean => countsAsEvidence(c) && hasEvidenceContent(c, notes);

/** How a conversation linked to a test reads on that test. Only "evidence" counts. */
export type LinkState = "evidence" | "advice" | "unconfirmed" | "no-content" | "needs-repair";
export type ConversationRecord = { path: string; data: EvidenceFields & { relatedTests: string[] }; notes: string };

/**
 * The one reciprocal-link rule: a link holds only when the test lists the conversation and the conversation lists the
 * test. A link either side makes alone (a partial write) is "needs-repair" and never counts. Conversations come back in
 * the order given; ones that don't exist aren't here (they're broken links, reported separately).
 */
export function testLinks<C extends ConversationRecord>(test: { path: string; data: { relatedConversations: string[] } }, conversations: C[]): { conversation: C; state: LinkState }[] {
  return conversations.flatMap((c) => {
    const fromTest = test.data.relatedConversations.includes(c.path);
    const fromConversation = c.data.relatedTests.includes(test.path);
    if (!fromTest && !fromConversation) return [];
    const state: LinkState = !(fromTest && fromConversation)
      ? "needs-repair"
      : !isCustomerEvidence(c.data.type)
        ? "advice"
        : c.data.seeded
          ? "unconfirmed"
          : !hasEvidenceContent(c.data, c.notes)
            ? "no-content"
            : "evidence";
    return [{ conversation: c, state }];
  });
}

/** How many conversations count as evidence on this test, by the reciprocal-link rule and isEvidenceEligible. */
export const evidenceCount = (test: { path: string; data: { relatedConversations: string[] } }, conversations: ConversationRecord[]): number =>
  testLinks(test, conversations).filter((l) => l.state === "evidence").length;

// Unknown dates (imported from a chat that didn't say when) sort last.
const newestFirst = (a: Row, b: Row) => (b.data.date ?? "").localeCompare(a.data.date ?? "") || a.path.localeCompare(b.path);

export function groupConversations<T extends Row>(rows: T[]): { evidence: T[]; advice: T[] } {
  const sorted = [...rows].sort(newestFirst);
  return { evidence: sorted.filter((r) => isCustomerEvidence(r.data.type)), advice: sorted.filter((r) => !isCustomerEvidence(r.data.type)) };
}

/** Open follow-ups due today or earlier, oldest due first, shaped for next-step tier 5. */
export function dueFollowUps(rows: Row[], today: string): { id: string; text: string; href: string; due: string }[] {
  return rows
    .flatMap((r) =>
      r.data.followUps
        .filter((f) => f.status === "open" && !!f.due && f.due <= today)
        .map((f) => ({ id: `${r.path}#${f.id}`, text: `Follow up with ${r.data.person}: ${f.text}`, href: `/conversations/${slugOf(r.path)}`, due: f.due as string })),
    )
    .sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
}
