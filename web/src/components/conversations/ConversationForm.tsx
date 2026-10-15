"use client";

import { useActionState } from "react";
import { createConversationAction, updateConversationAction } from "@/app/(workbook)/conversations/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { TYPE_LABELS } from "@/lib/loop-labels";

const GROUPS = [
  { legend: "Could buy: counts as customer evidence", types: ["customer", "prospect"] },
  { legend: "Advice and other: not customer evidence", types: ["mentor", "partner", "investor", "other"] },
] as const;
const FOLLOW_UP_ROWS = [0, 1, 2];
const chip = "flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink has-[:checked]:border-teal-dark has-[:checked]:bg-aqua/40";

type Props = { mode: "create" | "edit"; initial: Record<string, string>; path?: string; areaOptions: [string, string][]; returnTo?: string; plan?: { value: string; text: string } };

export function ConversationForm({ mode, initial, path, areaOptions, returnTo, plan }: Props) {
  const [state, formAction, pending] = useActionState(mode === "create" ? createConversationAction : updateConversationAction, IDLE);
  const v: Record<string, string> = { ...initial, ...state.values };
  const err = state.errors ?? {};
  const areas = new Set((v.areas ?? "").split(",").filter(Boolean));

  const input = (name: string, label: string, opts: { type?: string; placeholder?: string } = {}) => (
    <Field id={name} label={label} error={err[name]}>
      <input
        id={name}
        name={name}
        type={opts.type ?? "text"}
        defaultValue={v[name]}
        placeholder={opts.placeholder}
        className={inputClass}
        aria-invalid={!!err[name]}
        aria-describedby={describedBy(name, err[name])}
      />
    </Field>
  );
  const textArea = (name: string, label: string, rows: number, opts: { placeholder?: string; hint?: string } = {}) => (
    <Field id={name} label={label} hint={opts.hint} error={err[name]}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={v[name]}
        placeholder={opts.placeholder}
        className={inputClass}
        aria-invalid={!!err[name]}
        aria-describedby={describedBy(name, err[name], opts.hint)}
      />
    </Field>
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      {path && <input type="hidden" name="path" value={path} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      <fieldset aria-describedby={err.type ? "type-error" : undefined}>
        <legend className="mb-2 text-sm font-medium text-ink">Who you talked to</legend>
        <div className="space-y-3">
          {GROUPS.map((g) => (
            <div key={g.legend}>
              <p className="mb-1 text-xs font-medium text-muted">{g.legend}</p>
              <div className="flex flex-wrap gap-2">
                {g.types.map((t) => (
                  <label key={t} className={chip}>
                    <input type="radio" name="type" value={t} defaultChecked={v.type === t} /> {TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {err.type && (
          <p id="type-error" className={errorText}>
            {err.type}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {input("person", "Person", { placeholder: "e.g. Dana Ortiz, or “agency owner”" })}
        {input("org", "Organization (optional)", { placeholder: "e.g. Bright Home Care" })}
        {input("date", "Date", { type: "date" })}
        {input("segment", "Segment (optional)", { placeholder: "e.g. Agencies with 10–50 caregivers" })}
      </div>

      <fieldset className="space-y-4 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-medium text-ink">What you heard and saw</legend>
        {textArea("quotes", "Direct quotes, one per line", 3, { placeholder: "I lose my whole Friday to the schedule.", hint: "Their exact words. Paraphrase goes in notes." })}
        {textArea("numbers", "Numbers, one per line", 2, { placeholder: "4 hours a week on scheduling" })}
        {textArea("observedBehavior", "What they actually do today", 2, { placeholder: "Showed the spreadsheet she rebuilds every Friday" })}
        {textArea("alternatives", "Alternatives or workarounds they use", 2, { placeholder: "Spreadsheet plus group texts" })}
      </fieldset>

      <details className="rounded-lg border border-line p-4" open={!!(v.context || v.questionsAsked || v.urgency || v.buyingProcess)}>
        <summary className="cursor-pointer text-sm font-medium text-ink">Context, urgency and how they&apos;d buy</summary>
        <div className="mt-4 space-y-4">
          {textArea("context", "Context", 2, { placeholder: "How you met, how long you talked" })}
          {textArea("questionsAsked", "Questions you asked", 2)}
          {input("urgency", "Urgency", { placeholder: "e.g. Needs it before the holidays" })}
          {input("buyingProcess", "How they would buy", { placeholder: "e.g. The owner decides alone under $300 a month" })}
        </div>
      </details>

      <fieldset aria-describedby={err.areas ? "areas-error" : undefined}>
        <legend className="mb-1 text-sm font-medium text-ink">Steps it informs (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {areaOptions.map(([value, label]) => (
            <label key={value} className={chip}>
              <input type="checkbox" name="areas" value={value} defaultChecked={areas.has(value)} /> {label}
            </label>
          ))}
        </div>
        {err.areas && (
          <p id="areas-error" className={errorText}>
            {err.areas}
          </p>
        )}
      </fieldset>

      {mode === "create" && (
        <>
          <fieldset className="space-y-3 rounded-lg border border-line p-4">
            <legend className="px-1 text-sm font-medium text-ink">Follow-ups you promised (optional)</legend>
            {FOLLOW_UP_ROWS.map((i) => {
              const textId = `followUpText${i}`;
              const dueId = `followUpDue${i}`;
              return (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_11rem]">
                  <Field id={textId} label={`Follow-up ${i + 1}`} error={err[textId]}>
                    <input id={textId} name="followUpText" defaultValue={v[textId]} className={inputClass} aria-invalid={!!err[textId]} aria-describedby={describedBy(textId, err[textId])} />
                  </Field>
                  <Field id={dueId} label={`Follow-up ${i + 1} due`} error={err[dueId]}>
                    <input id={dueId} name="followUpDue" type="date" defaultValue={v[dueId]} className={inputClass} aria-invalid={!!err[dueId]} aria-describedby={describedBy(dueId, err[dueId])} />
                  </Field>
                </div>
              );
            })}
          </fieldset>
        </>
      )}

      {textArea("notes", "Notes", 8, { placeholder: "Paste your notes or a transcript. Claude can tidy them later." })}

      {mode === "create" && plan && (
        <div>
          <input type="hidden" name="plan" value={plan.value} />
          <label className="flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" name="planDone" defaultChecked={state.values ? state.values.planDone === "on" : true} className="mt-1" />
            <span>Mark &ldquo;{plan.text}&rdquo; done</span>
          </label>
        </div>
      )}

      {/* Editing sits under the record's own actions, so its save is quiet there. */}
      <button type="submit" disabled={pending} className={mode === "create" ? buttonPrimary : buttonQuiet}>
        {pending ? "Saving…" : mode === "create" ? "Save the conversation" : "Save changes"}
      </button>
    </form>
  );
}
