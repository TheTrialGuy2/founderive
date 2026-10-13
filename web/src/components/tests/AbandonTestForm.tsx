"use client";

import { useActionState } from "react";
import { abandonTestAction } from "@/app/(workbook)/tests/actions";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function AbandonTestForm({ path }: { path: string }) {
  const [state, formAction, pending] = useActionState(abandonTestAction, IDLE);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-teal-dark">Stop this test early</summary>
      <form action={formAction} className="mt-3 max-w-xl space-y-2">
        <input type="hidden" name="path" value={path} />
        <label htmlFor="abandon-reason" className="block text-ink">
          Why you&apos;re stopping it
        </label>
        <input id="abandon-reason" name="reason" defaultValue={state.values?.reason} placeholder="e.g. The assumption no longer matters" className={inputClass} />
        <button type="submit" disabled={pending} className={buttonQuiet}>
          {pending ? "Saving…" : "Stop the test"}
        </button>
        {state.status === "error" && (
          <p role="alert" className={errorText}>
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
