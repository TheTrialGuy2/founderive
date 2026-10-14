import type { KindData } from "../store/schemas";
import type { CanvasBlockDef } from "./canvas";
import { isEvidenceEligible } from "./conversations";
import { isoWeekId } from "./week";

export const YOU_STEP = "you";
export const DEFAULT_TALK_GOAL = 3;

type StepCopy = { meaning: string; doneWhen: string };

const YOU_COPY: StepCopy = { meaning: "Who you are, what you're building, and what you want from it.", doneWhen: "Setup is finished. You can change it anytime." };
const GENERIC_DONE_WHEN = "You've talked with people who have this need, and your answer reflects what they said.";

// Founderive's own words for the shipped generic blocks. A founder's own blocks use their prompt as the meaning.
const STEP_COPY: Record<string, StepCopy> = {
  customer: { meaning: "Who exactly has the problem, described well enough to find them.", doneWhen: "You've talked with people like this, and your description matches who they are." },
  problem: { meaning: "What's hard for them, in their words, not yours.", doneWhen: "People who have it describe it back to you." },
  solution: { meaning: "What you'll offer, in plain words.", doneWhen: "People with the problem have reacted to it, and your answer reflects what they said." },
  alternatives: { meaning: "What they do about it today, including nothing.", doneWhen: "Customers have told you what they use now and what it costs them." },
  advantage: { meaning: "Why they'd choose you over what they do today.", doneWhen: "Customers have told you what would make them switch." },
  channel: { meaning: "How they'll find you, and how the sale happens.", doneWhen: "You've reached real customers this way at least once." },
  revenue: { meaning: "Who pays, how much, and how often.", doneWhen: "You've asked people to pay and heard what they said." },
  cost: { meaning: "What one sale costs to deliver, and what it costs to keep going.", doneWhen: "You've written down real costs, not guesses." },
  feasibility: { meaning: "What must be true for you to deliver this.", doneWhen: "You know what could stop you and how you'd handle it." },
};

export type PathStep = {
  id: string;
  title: string;
  meaning: string;
  doneWhen: string;
  done: boolean;
  doneOn: string | null;
  doneReason: string | null;
  discussed: number;
  tested: boolean;
  planned: number;
  href: string;
};
export type PathView = { steps: PathStep[]; current: PathStep | null; doneCount: number; total: number; allDone: boolean };
export type PathConversation = { path: string; data: KindData<"conversation">; notes: string };
export type PathInput = {
  defs: CanvasBlockDef[];
  blocks: Map<string, { done?: string | null; doneReason?: string | null }>;
  setupComplete: boolean;
  conversations: PathConversation[];
  tests: { path: string; data: KindData<"test"> }[];
  openCommitments: { link?: string | null }[];
  focus: string | null | undefined;
};

/** Counts toward "people talked to": a confirmed customer or prospect conversation that records something. The one evidence rule, reused. */
export const isFeedbackConversation = (c: PathConversation): boolean => isEvidenceEligible(c.data, c.notes);

/** When a conversation happened: its `date`, or the date in its file name (conversations/YYYY-MM-DD-…) when unknown. */
export function conversationDate(c: { path: string; data: { date?: string | null } }): string {
  if (c.data.date) return c.data.date;
  const name = c.path.slice(c.path.lastIndexOf("/") + 1);
  return name.slice(0, 10);
}

/** Feedback conversations that happened in an ISO week. */
export function talkedToInWeek(conversations: PathConversation[], weekId: string): number {
  return conversations.filter((c) => isFeedbackConversation(c) && isoWeekId(conversationDate(c)) === weekId).length;
}

function discussed(id: string, conversations: PathConversation[]): number {
  // A customer conversation always says something about the customer, so an untagged one counts there.
  return conversations.filter((c) => isFeedbackConversation(c) && (c.data.areas.includes(id) || (id === "customer" && c.data.areas.length === 0))).length;
}

/** The founder's path: You, then their canvas blocks in order, each with what's been done on it. */
export function buildPath(input: PathInput): PathView {
  const you: PathStep = {
    id: YOU_STEP,
    title: "You",
    ...YOU_COPY,
    done: input.setupComplete,
    doneOn: null,
    doneReason: null,
    discussed: 0,
    tested: false,
    planned: 0,
    href: `/path/${YOU_STEP}`,
  };
  const steps: PathStep[] = [
    you,
    ...input.defs.map((def): PathStep => {
      const block = input.blocks.get(def.id);
      const copy = STEP_COPY[def.id];
      return {
        id: def.id,
        title: def.title,
        meaning: copy?.meaning ?? def.prompt,
        doneWhen: copy?.doneWhen ?? GENERIC_DONE_WHEN,
        done: !!block?.done,
        doneOn: block?.done ?? null,
        doneReason: block?.doneReason ?? null,
        discussed: discussed(def.id, input.conversations),
        tested: input.tests.some((t) => t.data.area === def.id && t.data.status === "complete" && t.data.result === "supported" && !t.data.seeded),
        planned: input.openCommitments.filter((c) => c.link === `step:${def.id}`).length,
        href: `/path/${def.id}`,
      };
    }),
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const focused = input.focus ? steps.find((s) => s.id === input.focus && s.id !== YOU_STEP) : undefined;
  const current = focused ?? steps.find((s) => !s.done) ?? null;
  return { steps, current, doneCount, total: steps.length, allDone };
}
