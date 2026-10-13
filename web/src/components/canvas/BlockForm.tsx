"use client";

import { useActionState } from "react";
import { saveCanvasBlockAction } from "@/app/(workbook)/canvas/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { CANVAS_STATUS_HELP, CANVAS_STATUS_LABELS, options } from "@/lib/loop-labels";

const TEXT_HINT = "What you believe now, in your own words. Earlier wording is kept below.";

export function BlockForm({ id, initial }: { id: string; initial: { text: string; status: string; notes: string } }) {
  const [state, formAction, pending] = useActionState(saveCanvasBlockAction, IDLE);
  const v = { ...initial, ...state.values };
  return (
    <form action={formAction} className="max-w-2xl space-y-5" noValidate>
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <input type="hidden" name="id" value={id} />
      <Field id="text" label="Current belief" hint={TEXT_HINT}>
        <textarea id="text" name="text" rows={4} defaultValue={v.text} className={inputClass} aria-describedby={describedBy("text", undefined, TEXT_HINT)} />
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink">How tested is it?</legend>
        <div className="space-y-2">
          {options(CANVAS_STATUS_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-start gap-2 rounded-md border border-line p-3 text-sm text-ink has-[:checked]:border-teal-dark has-[:checked]:bg-aqua/40">
              <input type="radio" name="status" value={value} defaultChecked={v.status === value} className="mt-1" />
              <span>
                <span className="font-medium">{label}</span> <span className="text-muted">{CANVAS_STATUS_HELP[value]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="notes" label="Notes (optional)">
        <textarea id="notes" name="notes" rows={4} defaultValue={v.notes} className={inputClass} />
      </Field>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Save block"}
      </button>
    </form>
  );
}
