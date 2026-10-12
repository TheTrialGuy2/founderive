import type { Conversation } from "@/data/types";

export type DraftWriteup = Omit<Conversation, "id" | "founderId" | "occurredAt">;

/**
 * Simulated write-up agent. Returns a canned draft so the wireframe can show the
 * review step; the real version calls a model and cites the transcript.
 */
export function draftWriteup(notes: string): DraftWriteup {
  if (/agency|owner|pricing/i.test(notes)) {
    return {
      type: "customer_discovery",
      with: "Lorraine P.",
      org: "BrightPath Home Care",
      relationship: "cold",
      newFact: "She already budgets for overtime, not software. A flat fee framed as overtime saved fits her budget.",
      // Live counts (interviews, momentum) are shown from state at review time, not baked into the draft.
      whatThisChanges: [
        "Revenue model: frame price against overtime saved",
        "Milestone 3 (pricing tested): one more agency tested",
      ],
      quotes: [
        "“I don't have a software budget. I have an overtime problem.”",
        "“If it paid for itself in a month, I wouldn't need to ask anyone.”",
      ],
      numbers: [
        { label: "Caregivers", value: "38" },
        { label: "Overtime last month", value: "$3,100" },
      ],
      contaminationFlags: [
        "You described Tandem before asking how she fills open shifts today. Her “that would help” came after the pitch, so treat it as a compliment, not a signal.",
      ],
      followUps: [
        { id: "fu-new-1", title: "Send overtime-savings estimate", owner: "founder", who: "Lorraine P.", dueAt: "2026-10-15", status: "open" },
      ],
    };
  }
  return {
    type: "peer",
    with: "Unnamed contact",
    org: "",
    relationship: "warm",
    newFact: "No new fact identified. Add one before approving, or discard.",
    whatThisChanges: [],
    quotes: [],
    numbers: [],
    contaminationFlags: [],
    followUps: [],
  };
}
