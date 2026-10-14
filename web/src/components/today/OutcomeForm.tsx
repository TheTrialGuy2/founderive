"use client";

import { useActionState } from "react";
import { saveOutcome } from "@/app/(workbook)/actions";
import { buttonPrimary, buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function OutcomeForm({ weekId, initial, primary = true }: { weekId: string; initial: string; primary?: boolean }) {
  const [state, formAction, pending] = useActionState(saveOutcome, IDLE);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="week" value={weekId} />
      <label htmlFor="outcome" className="block text-sm font-medium text-ink">
        This week&apos;s outcome
      </label>
      <textarea id="outcome" name="outcome" rows={2} defaultValue={state.values?.outcome ?? initial} className={inputClass} />
      <button type="submit" disabled={pending} className={primary ? buttonPrimary : buttonQuiet}>
        {pending ? "Saving…" : "Save this week's outcome"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
