"use client";

import { useActionState } from "react";
import { saveEvidenceNotesAction } from "@/app/(workbook)/tests/actions";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function EvidenceNotesForm({ path, initial }: { path: string; initial: string }) {
  const [state, formAction, pending] = useActionState(saveEvidenceNotesAction, IDLE);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="path" value={path} />
      <label htmlFor="evidence-notes" className="block text-sm font-medium text-ink">
        Evidence notes
      </label>
      <textarea
        id="evidence-notes"
        name="notes"
        rows={3}
        defaultValue={state.values?.notes ?? initial}
        placeholder="e.g. 2 of 5 offers made; Dana said yes in principle, no signature yet"
        className={inputClass}
      />
      <button type="submit" disabled={pending} className={buttonQuiet}>
        {pending ? "Saving…" : "Save evidence notes"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
