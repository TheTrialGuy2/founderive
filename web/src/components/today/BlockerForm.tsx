"use client";

import { useActionState } from "react";
import { saveBlocker } from "@/app/(workbook)/actions";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function BlockerForm({ weekId, blocker, help }: { weekId: string; blocker: string; help: string }) {
  const [state, formAction, pending] = useActionState(saveBlocker, IDLE);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="week" value={weekId} />
      <label className="block text-sm text-ink">
        What&apos;s in the way
        <textarea name="blocker" rows={2} defaultValue={state.values?.blocker ?? blocker} className={`${inputClass} mt-1`} />
      </label>
      <label className="block text-sm text-ink">
        Help you&apos;re asking for
        <textarea name="help" rows={2} defaultValue={state.values?.help ?? help} className={`${inputClass} mt-1`} />
      </label>
      <button type="submit" disabled={pending} className={buttonQuiet}>
        {pending ? "Saving…" : "Save blocker"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
