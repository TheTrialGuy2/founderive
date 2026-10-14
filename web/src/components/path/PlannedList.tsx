"use client";

import { saveCommitmentStatus } from "@/app/(workbook)/actions";
import { ActionButton } from "@/components/today/ActionButton";
import { ReasonForm } from "@/components/today/CommitmentList";
import { dueWords } from "@/core/due";
import type { PlannedConversation } from "@/commands/step";
import { commitmentFields } from "@/lib/commitment-fields";

/** The conversations planned for this step and still open, each with Done and Drop (Drop asks why). */
export function PlannedList({ planned, weekId, today }: { planned: PlannedConversation[]; weekId: string; today: string }) {
  if (planned.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-navy">Planned · {planned.length}</h3>
      <ul className="mt-2 space-y-2">
        {planned.map((p) => {
          const when = dueWords({ due: p.due, week: p.week }, today);
          return (
            <li key={`${p.week}:${p.id}`} className="rounded-lg border border-line bg-paper p-3">
              <p className="text-sm text-ink">
                {p.text}
                {when && <span className="text-muted"> · {when}</span>}
              </p>
              <div className="mt-2 flex flex-wrap items-start gap-2">
                <ActionButton action={saveCommitmentStatus} fields={commitmentFields(p, weekId, "done")} label="Done" variant="quiet" ariaLabel={`Done: ${p.text}`} />
                <ReasonForm action={saveCommitmentStatus} fields={commitmentFields(p, weekId, "dropped")} summary="Drop" submit="Drop it" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
