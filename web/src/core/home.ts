import { dueWords, type DueItem } from "./due";
import type { PathView } from "./path";

/** The one step whose page plans and logs conversations. Conversations about anything else are logged from People. */
export const CONVERSATION_STEP = "customer";

export type HomeAction =
  | { kind: "risk"; label: string; reason: string; href: string }
  | { kind: "outcome"; label: string; reason: string }
  | { kind: "blocker"; label: string; reason: string }
  | { kind: "overdue"; label: string; reason: string; key: string }
  | { kind: "imports"; label: string; reason: string; href: string }
  | { kind: "interpretation"; label: string; reason: string; href: string }
  | { kind: "step"; label: string; reason: string; href: string; stepId: string; mode: "plan" | "log" | "open" }
  | { kind: "focus"; label: string; reason: string };

/**
 * The one main action, shared by Home and `pnpm today` so the app and the agent always name the same thing. First
 * match wins: a risk, a missing outcome, a blocker, the earliest item past its date, imported conversations waiting
 * for the founder to confirm, the current step, then (every step done) choosing this week's focus. Only the Customer step's action is about a conversation.
 */
export function homeAction(input: {
  today: string;
  risk: { label: string; reason: string; href: string } | null;
  outcome: string | null | undefined;
  blocker: string | null | undefined;
  due: DueItem[];
  /** Imported conversations (seeded) the founder hasn't confirmed. They don't count as evidence until confirmed. */
  importedWaiting: number;
  /** Confirmed customer evidence that the founder hasn't connected to a change yet, oldest first. */
  changesWaiting: { person: string; href: string }[];
  path: PathView;
}): HomeAction | null {
  if (input.risk) return { kind: "risk", ...input.risk };
  if (!input.outcome) return { kind: "outcome", label: "Set this week's outcome", reason: "Everything this week is measured against it." };
  if (input.blocker) return { kind: "blocker", label: `Work through your blocker: ${input.blocker}`, reason: "It's stopping this week's outcome." };
  // The earliest-dated item past its date, whatever order the list came in.
  const late = input.due.filter((d) => !!d.due && d.due < input.today).reduce<DueItem | null>((min, d) => (!min || (d.due as string) < (min.due as string) ? d : min), null);
  if (late)
    return {
      kind: "overdue",
      label: late.text,
      reason:
        late.kind === "decision"
          ? `It's ${dueWords(late, input.today)}. Make the call or change its decide-by date.`
          : late.kind === "revisit"
            ? `It's ${dueWords(late, input.today)}. Say what happened, in a line.`
            : `It's ${dueWords(late, input.today)}. Finish it, or drop it with a reason.`,
      key: late.key,
    };
  if (input.importedWaiting > 0) {
    const n = input.importedWaiting;
    return { kind: "imports", label: `Review ${n} imported conversation${n === 1 ? "" : "s"}`, reason: "Imported conversations don't count until you confirm them.", href: "/people?show=imported" };
  }
  if (input.changesWaiting.length > 0) {
    const n = input.changesWaiting.length;
    return {
      kind: "interpretation",
      label: "Decide what this changes",
      reason: `${n} customer conversation${n === 1 ? " has" : "s have"} evidence you haven't connected to a change yet.`,
      href: input.changesWaiting[0].href,
    };
  }
  const step = input.path.current;
  if (step) {
    // Conversations are planned and logged on the Customer step only; every other step is about the answer.
    if (step.id !== CONVERSATION_STEP) return { kind: "step", label: `Continue: ${step.title}`, reason: "Work on your answer, then mark it done.", href: step.href, stepId: step.id, mode: "open" };
    const mode = step.planned > 0 ? "log" : step.discussed === 0 ? "plan" : "open";
    const label = mode === "plan" ? `Continue: plan a conversation about ${step.title}` : mode === "log" ? `Continue: log your conversation about ${step.title}` : `Continue: ${step.title}`;
    const reason =
      mode === "plan" ? "Nobody has discussed this step yet. One conversation starts it." : mode === "log" ? "You planned a conversation for this step." : `${step.discussed} ${step.discussed === 1 ? "person has" : "people have"} discussed it so far.`;
    return { kind: "step", label, reason, href: step.href, stepId: step.id, mode };
  }
  if (input.path.allDone) return { kind: "focus", label: "Choose this week's focus", reason: "Every step is done. Pick one to deepen this week." };
  return null;
}
