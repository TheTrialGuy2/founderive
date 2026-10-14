import { dueWords, type DueItem } from "./due";
import type { PathView } from "./path";

export type HomeAction =
  | { kind: "risk"; label: string; reason: string; href: string }
  | { kind: "outcome"; label: string; reason: string }
  | { kind: "blocker"; label: string; reason: string }
  | { kind: "overdue"; label: string; reason: string; key: string }
  | { kind: "step"; label: string; reason: string; href: string; stepId: string; mode: "plan" | "log" | "open" }
  | { kind: "focus"; label: string; reason: string };

/**
 * The one main action, shared by Home and `pnpm today` so the app and the agent always name the same thing. First
 * match wins: a risk, a missing outcome, a blocker, the earliest item past its date, the current step, then (every
 * step done) choosing this week's focus.
 */
export function homeAction(input: {
  today: string;
  risk: { label: string; reason: string; href: string } | null;
  outcome: string | null | undefined;
  blocker: string | null | undefined;
  due: DueItem[];
  path: PathView;
}): HomeAction | null {
  if (input.risk) return { kind: "risk", ...input.risk };
  if (!input.outcome) return { kind: "outcome", label: "Set this week's outcome", reason: "Everything this week is measured against it." };
  if (input.blocker) return { kind: "blocker", label: `Work through your blocker: ${input.blocker}`, reason: "It's stopping this week's outcome." };
  // The earliest-dated item past its date, whatever order the list came in.
  const late = input.due.filter((d) => !!d.due && d.due < input.today).reduce<DueItem | null>((min, d) => (!min || (d.due as string) < (min.due as string) ? d : min), null);
  if (late) return { kind: "overdue", label: late.text, reason: `It's ${dueWords(late, input.today)}. Finish it, or drop it with a reason.`, key: late.key };
  const step = input.path.current;
  if (step) {
    const mode = step.planned > 0 ? "log" : step.discussed === 0 ? "plan" : "open";
    const label = mode === "plan" ? `Continue: plan a conversation about ${step.title}` : mode === "log" ? `Continue: log your conversation about ${step.title}` : `Continue: ${step.title}`;
    const reason =
      mode === "plan" ? "Nobody has discussed this step yet. One conversation starts it." : mode === "log" ? "You planned a conversation for this step." : `${step.discussed} ${step.discussed === 1 ? "person has" : "people have"} discussed it so far.`;
    return { kind: "step", label, reason, href: step.href, stepId: step.id, mode };
  }
  if (input.path.allDone) return { kind: "focus", label: "Choose this week's focus", reason: "Every step is done. Pick one to deepen this week." };
  return null;
}
