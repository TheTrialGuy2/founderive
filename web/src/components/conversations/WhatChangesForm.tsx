"use client";

import { useActionState } from "react";
import { confirmWhatChangesAction } from "@/app/(workbook)/conversations/actions";
import { buttonPrimary, buttonQuiet, errorText, inputClass, radioChip } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { options, STANCE_LABELS } from "@/lib/loop-labels";
import type { Stance } from "@/store/schemas";

/**
 * The founder's own reading of what the conversation changes, and which way it cuts. Unconfirmed, this is the
 * screen's primary action. The stance is required: the command refuses a confirmation without one.
 */
export function WhatChangesForm({ path, initial, initialStance, confirmed }: { path: string; initial: string; initialStance: Stance | null; confirmed: boolean }) {
  const [state, formAction, pending] = useActionState(confirmWhatChangesAction, IDLE);
  const stance = state.values?.stance ?? initialStance ?? "";
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="path" value={path} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink">Does it support what you believe?</legend>
        <div className="flex flex-wrap gap-2">
          {options(STANCE_LABELS).map(([value, label]) => (
            <label key={value} className={radioChip}>
              <input type="radio" name="stance" value={value} defaultChecked={stance === value} /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="whatChanges" className="mb-1 block text-sm font-medium text-ink">
          {confirmed ? "What changed, in your words" : "What did this change for you?"}
        </label>
        <textarea
          id="whatChanges"
          name="whatChanges"
          rows={3}
          defaultValue={state.values?.whatChanges ?? initial}
          placeholder="Owners feel this every week, and the price ceiling may be near $300 a month"
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={confirmed ? buttonQuiet : buttonPrimary}>
        {pending ? "Saving…" : "Confirm what changed"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
