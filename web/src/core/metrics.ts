import type { Conversation, CountingRule, Observation } from "@/data/types";

/**
 * Applies a metric's counting rule to the conversation log. This is the one place
 * a count is computed; every screen that shows the number calls this.
 */
export function countConversations(
  conversations: Conversation[],
  rule: CountingRule,
): { count: number; excluded: Conversation[] } {
  const ofType = conversations.filter((c) => c.type === rule.type);
  const excluded = ofType.filter((c) => rule.excludeRelationships.includes(c.relationship));
  return { count: ofType.length - excluded.length, excluded };
}

/** Most recent observation that hasn't been retracted. Retracted values stay in the log. */
export function latestValue(observations: Observation[]): { value: number; observedAt: string } | null {
  const live = observations
    .filter((o) => !o.retractedReason)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  return live[0] ? { value: live[0].value, observedAt: live[0].observedAt } : null;
}

/** First number in a founder-typed value ("$20,000 (cash…)" → 20000), so corrections can roll up. */
export function parseAmount(value: string): number | undefined {
  const match = value.match(/\d[\d,]*(\.\d+)?/);
  return match ? Number(match[0].replace(/,/g, "")) : undefined;
}
