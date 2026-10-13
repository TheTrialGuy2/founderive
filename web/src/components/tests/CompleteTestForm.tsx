"use client";

import { useActionState, useState } from "react";
import { completeTestAction } from "@/app/(workbook)/tests/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { DECISION_HELP, DECISION_LABELS, options, RESULT_HELP, RESULT_LABELS, STRENGTH_GUIDE, STRENGTH_LABELS } from "@/lib/loop-labels";
import type { EvidenceStrength } from "@/store/schemas";

const option = "flex items-start gap-2 rounded-md border border-line p-3 text-sm text-ink has-[:checked]:border-teal-dark has-[:checked]:bg-aqua/40";

/** Result first (what the evidence showed), then the decision (what the founder will do). Nothing is pre-selected. */
export function CompleteTestForm({ path, strength }: { path: string; strength: EvidenceStrength }) {
  const [state, formAction, pending] = useActionState(completeTestAction, IDLE);
  const v = state.values ?? {};
  const err = state.errors ?? {};
  const [result, setResult] = useState(v.result ?? "");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <input type="hidden" name="path" value={path} />

      <fieldset aria-describedby={err.result ? "result-error" : undefined}>
        <legend className="mb-2 text-sm font-semibold text-ink">1. Result: what did the evidence show?</legend>
        <div className="space-y-2">
          {options(RESULT_LABELS).map(([value, label]) => (
            <label key={value} className={option}>
              <input type="radio" name="result" value={value} checked={result === value} onChange={() => setResult(value)} className="mt-1" />
              <span>
                <span className="font-medium">{label}.</span> <span className="text-muted">{RESULT_HELP[value]}</span>
              </span>
            </label>
          ))}
        </div>
        {err.result && (
          <p id="result-error" className={errorText}>
            {err.result}
          </p>
        )}
      </fieldset>

      <Field id="evidenceStrength" label="How strong is the evidence?" hint={STRENGTH_GUIDE} error={err.evidenceStrength}>
        <select
          id="evidenceStrength"
          name="evidenceStrength"
          defaultValue={v.evidenceStrength ?? strength}
          className={inputClass}
          aria-invalid={!!err.evidenceStrength}
          aria-describedby={describedBy("evidenceStrength", err.evidenceStrength, STRENGTH_GUIDE)}
        >
          {options(STRENGTH_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field id="learning" label="What you learned" error={err.learning}>
        <textarea id="learning" name="learning" rows={3} defaultValue={v.learning} className={inputClass} aria-invalid={!!err.learning} aria-describedby={describedBy("learning", err.learning)} />
      </Field>

      {result ? (
        <>
          <fieldset aria-describedby={err.decision ? "decision-error" : undefined}>
            <legend className="mb-2 text-sm font-semibold text-ink">2. Decision: what will you do about it?</legend>
            <div className="space-y-2">
              {options(DECISION_LABELS).map(([value, label]) => (
                <label key={value} className={option}>
                  <input type="radio" name="decision" value={value} defaultChecked={v.decision === value} className="mt-1" />
                  <span>
                    <span className="font-medium">{label}.</span> <span className="text-muted">{DECISION_HELP[value]}</span>
                  </span>
                </label>
              ))}
            </div>
            {err.decision && (
              <p id="decision-error" className={errorText}>
                {err.decision}
              </p>
            )}
          </fieldset>
          <Field id="why" label="Why you chose this" error={err.why}>
            <textarea id="why" name="why" rows={2} defaultValue={v.why} className={inputClass} aria-invalid={!!err.why} aria-describedby={describedBy("why", err.why)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
            <Field id="nextCommitment" label="Your next commitment" hint="It's added to this week on Today. Optional if you chose Stop." error={err.nextCommitment}>
              <input
                id="nextCommitment"
                name="nextCommitment"
                defaultValue={v.nextCommitment}
                className={inputClass}
                aria-invalid={!!err.nextCommitment}
                aria-describedby={describedBy("nextCommitment", err.nextCommitment, "It's added to this week on Today. Optional if you chose Stop.")}
              />
            </Field>
            <Field id="nextCommitmentDue" label="Due (optional)" error={err.nextCommitmentDue}>
              <input
                id="nextCommitmentDue"
                name="nextCommitmentDue"
                type="date"
                defaultValue={v.nextCommitmentDue}
                className={inputClass}
                aria-invalid={!!err.nextCommitmentDue}
                aria-describedby={describedBy("nextCommitmentDue", err.nextCommitmentDue)}
              />
            </Field>
          </div>
          <button type="submit" disabled={pending} className={buttonPrimary}>
            {pending ? "Saving…" : "Complete the test"}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Pick a result first. Then you&apos;ll choose what to do about it.</p>
      )}
    </form>
  );
}
