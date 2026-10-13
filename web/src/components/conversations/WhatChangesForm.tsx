"use client";

import { useActionState } from "react";
import { confirmWhatChangesAction } from "@/app/(workbook)/conversations/actions";
import { buttonPrimary, buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

/** The founder's own reading of what the conversation changes. Unconfirmed, this is the screen's primary action. */
export function WhatChangesForm({ path, initial, confirmed }: { path: string; initial: string; confirmed: boolean }) {
  const [state, formAction, pending] = useActionState(confirmWhatChangesAction, IDLE);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="path" value={path} />
      <label htmlFor="whatChanges" className="block text-sm font-medium text-ink">
        {confirmed ? "What this changes, in your words" : "What does this change for you?"}
      </label>
      <textarea
        id="whatChanges"
        name="whatChanges"
        rows={3}
        defaultValue={state.values?.whatChanges ?? initial}
        placeholder="e.g. Owners feel this every week, and the price ceiling may be near $300 a month"
        className={inputClass}
      />
      <button type="submit" disabled={pending} className={confirmed ? buttonQuiet : buttonPrimary}>
        {pending ? "Saving…" : "Confirm what this changes"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
