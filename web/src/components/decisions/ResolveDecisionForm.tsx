"use client";

import { useActionState } from "react";
import { resolveDecisionAction } from "@/app/(workbook)/decisions/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, errorText, inputClass, radioChip } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function ResolveDecisionForm({ path }: { path: string }) {
  const [state, action, pending] = useActionState(resolveDecisionAction, IDLE);
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  return (
    <form action={action} className="mt-4 space-y-4 border-t border-line pt-4" noValidate>
      <input type="hidden" name="path" value={path} />
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <Field id={`${path}-decision`} label="What did you decide?" error={errors.decision}>
        <textarea id={`${path}-decision`} name="decision" rows={2} defaultValue={values.decision} className={inputClass} aria-invalid={!!errors.decision} aria-describedby={describedBy(`${path}-decision`, errors.decision)} />
      </Field>
      <Field id={`${path}-why`} label="Why?" error={errors.why}>
        <textarea id={`${path}-why`} name="why" rows={2} defaultValue={values.why} className={inputClass} aria-invalid={!!errors.why} aria-describedby={describedBy(`${path}-why`, errors.why)} />
      </Field>
      <fieldset aria-describedby={errors.reversible ? `${path}-reversible-error` : undefined}>
        <legend className="mb-1 text-sm font-medium text-ink">Can you undo it easily?</legend>
        <div className="flex flex-wrap gap-2">
          {[["yes", "Yes, easy to undo"], ["no", "No, hard to undo"]].map(([value, label]) => (
            <label key={value} className={radioChip}><input type="radio" name="reversible" value={value} defaultChecked={values.reversible === value} /> {label}</label>
          ))}
        </div>
        {errors.reversible && <p id={`${path}-reversible-error`} className={errorText}>{errors.reversible}</p>}
      </fieldset>
      <Field id={`${path}-revisitOn`} label="Revisit on (optional)" hint="The day Home asks what happened." error={errors.revisitOn}>
        <input id={`${path}-revisitOn`} name="revisitOn" type="date" defaultValue={values.revisitOn} className={inputClass} aria-invalid={!!errors.revisitOn} aria-describedby={describedBy(`${path}-revisitOn`, errors.revisitOn, "The day Home asks what happened.")} />
      </Field>
      <button type="submit" disabled={pending} className={buttonPrimary}>{pending ? "Saving…" : "Save decision"}</button>
    </form>
  );
}
