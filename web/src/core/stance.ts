import { conversationDate, discussesStep, type PathConversation } from "./path";

/** How the people who discussed a step split. `neither` and a missing stance are in neither lane. */
export type StanceCounts = { supports: number; challenges: number };

/** Newest first by when they talked (the file date when the date is unknown), then by path so the order is stable. */
export const byNewest = <T extends { path: string; data: { date?: string | null } }>(a: T, b: T): number =>
  conversationDate(b).localeCompare(conversationDate(a)) || a.path.localeCompare(b.path);

/**
 * Counts the founder's stances among the feedback conversations that discussed a step. discussesStep is the one rule
 * for who counts, so advice, unconfirmed imports, conversations with nothing recorded and conversations tagged with
 * other steps are never looked at, and a stance only counts once "what this changes" is confirmed. The founder set
 * each stance; nothing here infers one.
 */
export function stanceCounts(conversations: PathConversation[], stepId: string): StanceCounts {
  const counts: StanceCounts = { supports: 0, challenges: 0 };
  for (const c of conversations) {
    if (!discussesStep(c, stepId) || !c.data.whatChangesConfirmed) continue;
    if (c.data.stance === "supports") counts.supports++;
    else if (c.data.stance === "challenges") counts.challenges++;
  }
  return counts;
}

/**
 * The feedback conversations on a step the founder marked as challenging what they believe, newest first. A stance
 * on an unconfirmed interpretation never lists here.
 */
export function challengers<T extends PathConversation>(conversations: T[], stepId: string): T[] {
  return conversations.filter((c) => discussesStep(c, stepId) && c.data.whatChangesConfirmed && c.data.stance === "challenges").sort(byNewest);
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The step chip. A supported test still outranks talk. Otherwise the people count, then each stance lane that has
 * anyone in it ("4 people discussed this · 3 support · 1 challenges"); with no stances it reads as it always did.
 * Only the Customer step (`conversations`) says when nobody has discussed it yet.
 */
export function chipText(discussed: number, counts: StanceCounts, tested: boolean, conversations: boolean): string {
  if (tested) return "Tested · supported";
  if (discussed === 0) return conversations ? "Your guess · not discussed yet" : "Your guess";
  const parts = [`${count(discussed, "person", "people")} discussed this`];
  if (counts.supports > 0) parts.push(count(counts.supports, "supports", "support"));
  if (counts.challenges > 0) parts.push(count(counts.challenges, "challenges", "challenge"));
  return parts.join(" · ");
}
