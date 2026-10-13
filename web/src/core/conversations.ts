import { CUSTOMER_TYPES, type ConversationType } from "../store/schemas";
import { slugOf } from "./slug";

type Row = {
  path: string;
  data: { type: ConversationType; date?: string | null; person: string; followUps: { id: string; text: string; due?: string | null; status: "open" | "done" }[] };
};

/** Customer and prospect conversations are evidence. Mentor, investor, partner and other conversations are advice (amendment §5.3). */
export const isCustomerEvidence = (type: ConversationType): boolean => CUSTOMER_TYPES.includes(type);

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
