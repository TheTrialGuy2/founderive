"use client";

import { useActionState } from "react";
import { createDecisionAction } from "@/app/(workbook)/decisions/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { AREA_LABELS, options } from "@/lib/loop-labels";

type Props = { today: string; evidenceOptions: { path: string; label: string }[]; tests: { path: string; title: string }[] };
const chip = "flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink has-[:checked]:border-teal-dark has-[:checked]:bg-aqua/40";

export function DecisionForm({ today, evidenceOptions, tests }: Props) {
  const [state, formAction, pending] = useActionState(createDecisionAction, IDLE);
  const v: Record<string, string> = { date: today, ...state.values };
  const err = state.errors ?? {};
  const chosen = new Set((v.evidence ?? "").split(",").filter(Boolean));
  const textArea = (name: string, label: string, opts: { placeholder?: string; hint?: string } = {}) => (
    <Field id={name} label={label} hint={opts.hint} error={err[name]}>
      <textarea
        id={name}
        name={name}
        rows={2}
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
      {state.status === "saved" && (
        <p role="status" className="text-sm text-teal-dark">
          Decision recorded.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field id="title" label="Name the decision" error={err.title}>
          <input id="title" name="title" defaultValue={v.title} placeholder="e.g. Focus on agencies with 10–50 caregivers" className={inputClass} aria-invalid={!!err.title} aria-describedby={describedBy("title", err.title)} />
        </Field>
        <Field id="date" label="Date" error={err.date}>
          <input id="date" name="date" type="date" defaultValue={v.date} className={inputClass} aria-invalid={!!err.date} aria-describedby={describedBy("date", err.date)} />
        </Field>
      </div>
      <Field id="area" label="Part of the business (optional)" error={err.area}>
        <select id="area" name="area" defaultValue={v.area ?? ""} className={inputClass}>
          <option value="">None</option>
          {options(AREA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {textArea("beliefBefore", "What you believed before (optional)", { placeholder: "e.g. Any home-care agency is a fit" })}
      {textArea("decision", "What you decided", { placeholder: "e.g. Talk only to agencies with 10–50 caregivers this month" })}
      {textArea("why", "Why", { hint: "Future you will want to know." })}
      {textArea("alternatives", "Alternatives you considered (optional, one per line)", { placeholder: "Large agencies\nIndependent caregivers" })}
      <fieldset aria-describedby={err.reversible ? "reversible-error" : undefined}>
        <legend className="mb-1 text-sm font-medium text-ink">Can you undo it easily?</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["yes", "Yes, easy to undo"],
            ["no", "No, hard to undo"],
          ].map(([value, label]) => (
            <label key={value} className={chip}>
              <input type="radio" name="reversible" value={value} defaultChecked={v.reversible === value} /> {label}
            </label>
          ))}
        </div>
        {err.reversible && (
          <p id="reversible-error" className={errorText}>
            {err.reversible}
          </p>
        )}
      </fieldset>
      {evidenceOptions.length > 0 && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-ink">Evidence it rests on (optional)</legend>
          <div className="space-y-1">
            {evidenceOptions.map((o) => (
              <label key={o.path} className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="evidence" value={o.path} defaultChecked={chosen.has(o.path)} /> {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {tests.length > 0 && (
        <Field id="relatedTest" label="Related test (optional)">
          <select id="relatedTest" name="relatedTest" defaultValue={v.relatedTest ?? ""} className={inputClass}>
            <option value="">None</option>
            {tests.map((t) => (
              <option key={t.path} value={t.path}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Record the decision"}
      </button>
    </form>
  );
}
