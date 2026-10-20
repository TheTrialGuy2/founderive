"use client";

import { useActionState } from "react";
import { saveLinkedCommitment } from "@/app/(workbook)/actions";
import { Field, FormAlert, describedBy } from "@/components/workbook/Field";
import { buttonQuiet, inputClass } from "@/components/workbook/form";
import type { SourceKind } from "@/core/commitment-source";
import { IDLE } from "@/lib/action-state";

/**
 * Make a commitment where the reason is: on a conversation or a decision. The record's path travels in `link`, so Home
 * says where it came from. Secondary everywhere: a quiet disclosure, never the page's primary action. After a save the
 * fields clear (the action returns no values) and the saved line arrives through the live data event.
 */
export function LinkedCommitmentForm({ weekId, link, sourceKind }: { weekId: string; link: string; sourceKind: Exclude<SourceKind, "test"> }) {
  const [state, action, pending] = useActionState(saveLinkedCommitment, IDLE);
  const id = `${link}-commitment`;
  const hint = `It's added to this week on Home, linked to this ${sourceKind}.`;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-teal-dark">Make a commitment</summary>
      <form action={action} className="mt-3 space-y-3" noValidate>
        <input type="hidden" name="week" value={weekId} />
        <input type="hidden" name="link" value={link} />
        <FormAlert message={state.status === "error" ? state.message : undefined} />
        {state.status === "saved" && (
          <p role="status" className="text-sm text-teal-dark">
            Commitment saved
          </p>
        )}
        <Field id={`${id}-text`} label="What will you do?" hint={hint}>
          <input id={`${id}-text`} name="text" type="text" defaultValue={state.values?.text ?? ""} placeholder="Send Dana the pilot outline" className={inputClass} aria-describedby={describedBy(`${id}-text`, undefined, hint)} />
        </Field>
        <Field id={`${id}-due`} label="Due (optional)">
          <input id={`${id}-due`} name="due" type="date" defaultValue={state.values?.due ?? ""} className={inputClass} />
        </Field>
        <button type="submit" disabled={pending} className={buttonQuiet}>
          {pending ? "Saving…" : "Save commitment"}
        </button>
      </form>
    </details>
  );
}
