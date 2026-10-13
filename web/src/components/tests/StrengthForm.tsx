"use client";

import { useActionState } from "react";
import { setEvidenceStrengthAction } from "@/app/(workbook)/tests/actions";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { options, STRENGTH_GUIDE, STRENGTH_LABELS } from "@/lib/loop-labels";
import type { EvidenceStrength } from "@/store/schemas";

/** The founder rates the evidence (spec §0); the app never infers it. */
export function StrengthForm({ path, value }: { path: string; value: EvidenceStrength }) {
  const [state, formAction, pending] = useActionState(setEvidenceStrengthAction, IDLE);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="path" value={path} />
      <div>
        <label htmlFor="strength" className="mb-1 block text-sm font-medium text-ink">
          How strong is the evidence?
        </label>
        <select id="strength" name="strength" defaultValue={value} className={inputClass} aria-describedby="strength-guide">
          {options(STRENGTH_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={buttonQuiet}>
        {pending ? "Saving…" : "Save strength"}
      </button>
      <p id="strength-guide" className="w-full text-xs text-muted">
        {STRENGTH_GUIDE}
      </p>
      {state.status === "error" && (
        <p role="alert" className={`${errorText} w-full`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
