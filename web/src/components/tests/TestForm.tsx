"use client";

import { useActionState } from "react";
import { createTestAction } from "@/app/(workbook)/tests/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { AREA_LABELS, options } from "@/lib/loop-labels";

export function TestForm({ initial }: { initial: Record<string, string> }) {
  const [state, formAction, pending] = useActionState(createTestAction, IDLE);
  const v: Record<string, string> = { ...initial, ...state.values };
  const err = state.errors ?? {};
  const textArea = (name: string, label: string, opts: { placeholder?: string; hint?: string; rows?: number } = {}) => (
    <Field id={name} label={label} hint={opts.hint} error={err[name]}>
      <textarea
        id={name}
        name={name}
        rows={opts.rows ?? 2}
        defaultValue={v[name]}
        placeholder={opts.placeholder}
        className={inputClass}
        aria-invalid={!!err[name]}
        aria-describedby={describedBy(name, err[name], opts.hint)}
      />
    </Field>
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-5" noValidate>
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <Field id="title" label="Name the test" error={err.title}>
        <input id="title" name="title" defaultValue={v.title} placeholder="e.g. Ask agency owners to pay for a pilot" className={inputClass} aria-invalid={!!err.title} aria-describedby={describedBy("title", err.title)} />
      </Field>
      <Field id="area" label="Part of the business it tests" error={err.area}>
        <select id="area" name="area" defaultValue={v.area ?? ""} className={inputClass} aria-invalid={!!err.area} aria-describedby={describedBy("area", err.area)}>
          <option value="">Choose one</option>
          {options(AREA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {textArea("belief", "What you believe", { hint: "Write it as a claim that could turn out to be false.", placeholder: "e.g. Agency owners will pay $200 a month to stop rebuilding schedules" })}
      {textArea("risk", "Why it might be wrong (optional)", { placeholder: "e.g. They feel the pain but won't pay for a new tool yet" })}
      {textArea("test", "What you'll do to test it", { hint: "Small, real and quick: an offer, a pre-sale, five conversations.", placeholder: "e.g. Offer a paid four-week pilot to five qualified owners" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {textArea("successCriteria", "Supported if…", { hint: "Decide now, with a number if you can.", placeholder: "e.g. At least two sign a paid pilot" })}
        {textArea("failureCriteria", "Contradicted if…", { hint: "What result would prove the belief wrong?", placeholder: "e.g. None accept after five offers" })}
      </div>
      <div className="max-w-56">
        <Field id="due" label="Decide by (optional)" error={err.due}>
          <input id="due" name="due" type="date" defaultValue={v.due} className={inputClass} aria-invalid={!!err.due} aria-describedby={describedBy("due", err.due)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="startNow" defaultChecked={v.startNow === "on"} /> I&apos;m starting it now (it becomes the current test on Today)
      </label>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Save the test"}
      </button>
    </form>
  );
}
