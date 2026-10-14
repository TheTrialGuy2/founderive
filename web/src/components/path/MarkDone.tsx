"use client";

import { markStepDoneAction, reopenStepAction } from "@/app/(workbook)/path/actions";
import { InlineForm } from "@/components/home/InlineForm";
import { ActionButton } from "@/components/today/ActionButton";
import { formatDate } from "@/components/ui";
import { buttonQuiet, inputClass } from "@/components/workbook/form";
import type { PathStep } from "@/core/path";

export function MarkDone({ step, nextStep }: { step: PathStep; nextStep: PathStep | null }) {
  if (step.done) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold text-navy">Done{step.doneOn ? ` ${formatDate(step.doneOn)}` : ""}</span>
        {step.doneReason && <span className="text-muted">· {step.doneReason}</span>}
        <ActionButton action={reopenStepAction} fields={{ id: step.id }} label="Reopen" variant="quiet" />
      </div>
    );
  }
  return (
    <details>
      <summary className={`${buttonQuiet} cursor-pointer list-none`}>Mark step done{nextStep ? ` → ${nextStep.title}` : ""}</summary>
      <p className="mt-2 text-sm text-muted">You can reopen it anytime; your answer stays.</p>
      <InlineForm action={markStepDoneAction} fields={{ id: step.id }} submit="Mark done">
        {(v) => (
          <label className="min-w-64 flex-1 text-sm text-ink">
            Ready to move on because… (optional)
            <input name="reason" defaultValue={v.reason} className={`${inputClass} mt-1`} />
          </label>
        )}
      </InlineForm>
    </details>
  );
}
