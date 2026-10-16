"use client";

import { useActionState } from "react";
import { recordOutcomeAction } from "@/app/(workbook)/decisions/actions";
import { Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

/**
 * Closes the loop on a decided decision once its revisit date has come: what happened, in the founder's words. While
 * it shows, it is the card's one primary action. The date is the app's today, set on the server.
 */
export function OutcomeForm({ path }: { path: string }) {
  const [state, action, pending] = useActionState(recordOutcomeAction, IDLE);
  const id = `${path}-outcome`;
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-line pt-4" noValidate>
      <input type="hidden" name="path" value={path} />
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <Field id={id} label="What happened?">
        <textarea id={id} name="outcome" rows={3} defaultValue={state.values?.outcome} placeholder="Two of the five agencies signed; the third said the price was the problem, not the tool." className={inputClass} />
      </Field>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Record what happened"}
      </button>
    </form>
  );
}
