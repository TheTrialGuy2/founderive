import type { ConversationType } from "../store/schemas";
import { isEvidenceEligible } from "./conversations";
import { conversationDate } from "./path";

/** What synthesis needs from a conversation: the evidence fields, a date and the notes body. */
export type SynthesisRecord = {
  path: string;
  data: { type: ConversationType; seeded?: boolean; date?: string | null; observedBehavior?: string | null; quotes?: string[]; numbers?: string[] };
  notes: string;
};

/** Under this many qualifying conversations there's nothing to synthesize, so Home shows no button. */
export const SYNTHESIZE_MIN = 3;
/** The skill reads at most this many; the label says "last 5" from here up. */
export const SYNTHESIZE_MAX = 5;
/**
 * The line the Home button types into the Claude panel. AGENTS.md routes a message starting with it to
 * .claude/skills/synthesize/SKILL.md, so the three must stay identical.
 */
export const SYNTHESIZE_LINE = "Synthesize my last five customer conversations in Founderive.";

/**
 * Conversations a synthesis can read: confirmed customer or prospect conversations that record something
 * (the one evidence predicate in core/conversations), newest first. Unknown dates fall back to the file name.
 * Not capped here: the count drives the label, and the skill takes the first SYNTHESIZE_MAX.
 */
export function synthesizable<T extends SynthesisRecord>(records: T[]): T[] {
  return records
    .filter((c) => isEvidenceEligible(c.data, c.notes))
    .sort((a, b) => conversationDate(b).localeCompare(conversationDate(a)) || a.path.localeCompare(b.path));
}

/** The Home button's text, or null when there's too little to synthesize. Never a shortfall. */
export function synthesizeLabel(count: number): string | null {
  if (count < SYNTHESIZE_MIN) return null;
  return count >= SYNTHESIZE_MAX ? `Synthesize your last ${SYNTHESIZE_MAX} conversations` : `Synthesize your ${count} conversations`;
}
