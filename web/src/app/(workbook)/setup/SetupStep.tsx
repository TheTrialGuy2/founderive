"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { saveSetupStepAction } from "@/app/(workbook)/actions";
import { buttonPrimary, buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { US_STATES } from "@/lib/us-states";

const TITLES = ["You", "Your venture", "Where you are", "Customer, goal and time"];
const COMMITMENT = [
  ["full-time", "Full-time"],
  ["part-time", "Part-time"],
  ["nights-weekends", "Nights and weekends"],
] as const;
const COFOUNDERS = [
  ["solo", "Just me"],
  ["two", "Two founders"],
  ["three-plus", "Three or more"],
] as const;
const MODELS = [
  ["service", "Service"],
  ["local-business", "Local business"],
  ["physical-product", "Physical product"],
  ["software", "Software"],
  ["marketplace", "Marketplace"],
  ["nonprofit", "Nonprofit"],
  ["other", "Other"],
] as const;
const STAGES = [
  ["idea", "Idea"],
  ["validating", "Validating"],
  ["pre-revenue", "Pre-revenue"],
  ["revenue", "Revenue-generating"],
] as const;
const EVIDENCE = [
  ["none", "None yet"],
  ["conversations", "Customer conversations"],
  ["active-users", "Active users"],
  ["paying-customers", "Paying customers"],
  ["repeat-customers", "Repeat customers"],
] as const;

export function SetupStep({ step, initial, canJump }: { step: number; initial: Record<string, string>; canJump: boolean }) {
  const [state, formAction, pending] = useActionState(saveSetupStepAction, IDLE);
  const v = { ...initial, ...state.values };
  const err = state.errors ?? {};
  const [inProgram, setInProgram] = useState(v.inProgram === "on");
  const [cofounders, setCofounders] = useState(v.cofounders);
  const initialCofounderNames: string[] = (() => {
    try {
      const parsed = JSON.parse(v.cofounderNames || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const [cofounderNames, setCofounderNames] = useState<string[]>(initialCofounderNames.length >= 2 ? initialCofounderNames : [...initialCofounderNames, ...Array(2 - initialCofounderNames.length).fill("")]);
  const last = step === TITLES.length;

  const text = (name: string, label: string, example: string, props: { type?: string; optional?: boolean } = {}) => (
    <Field id={name} label={props.optional ? `${label} (optional)` : label} error={err[name]}>
      <input
        id={name}
        name={name}
        type={props.type ?? "text"}
        defaultValue={v[name]}
        placeholder={example}
        className={inputClass}
        aria-invalid={!!err[name]}
        aria-describedby={err[name] ? `${name}-error` : undefined}
      />
    </Field>
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      <div>
        {canJump ? (
          <nav aria-label="Setup steps">
            <ol className="flex flex-wrap gap-4 text-sm">
              {TITLES.map((t, i) => {
                const n = i + 1;
                return (
                  <li key={t}>
                    <Link href={`/setup?step=${n}`} aria-current={n === step ? "step" : undefined} className={n === step ? "font-semibold text-ink underline" : "text-teal-dark underline"}>
                      {n}. {t}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">
              Step {step} of {TITLES.length} · {TITLES[step - 1]}
            </p>
            <div className="mt-2 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={TITLES.length} aria-valuenow={step} aria-label="Setup progress">
              {TITLES.map((t, i) => (
                <span key={t} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-teal-dark" : "bg-sand"}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-md border border-coral bg-coral-soft/60 p-3 text-sm text-ink">
          {state.message}
        </p>
      )}
      <input type="hidden" name="step" value={step} />

      {step === 1 && (
        <>
          {text("name", "Your name", "e.g. Sam Rivera")}
          <div className="grid gap-4 sm:grid-cols-2">
            {text("city", "City", "e.g. Charlotte")}
            <Field id="region" label="State" error={err.region}>
              <select id="region" name="region" defaultValue={v.region} className={inputClass} aria-invalid={!!err.region} aria-describedby={err.region ? "region-error" : undefined}>
                <option value="">Choose a state</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Choice name="commitment" legend="Time you're giving it" options={COMMITMENT} value={v.commitment} error={err.commitment} />
          <Choice name="cofounders" legend="Founders" options={COFOUNDERS} value={cofounders} error={err.cofounders} onChange={setCofounders} />
          {cofounders === "two" && (
            <Field id="cofounderName-0" label="Your co-founder's name (optional)">
              <input id="cofounderName-0" name="cofounderName" defaultValue={initialCofounderNames[0] ?? ""} placeholder="e.g. Jordan Lee" className={inputClass} />
            </Field>
          )}
          {cofounders === "three-plus" && (
            <div className="space-y-3">
              {cofounderNames.map((name, i) => (
                <Field key={i} id={`cofounderName-${i}`} label={`Co-founder ${i + 1} (optional)`}>
                  <div className="flex gap-2">
                    <input
                      id={`cofounderName-${i}`}
                      name="cofounderName"
                      value={name}
                      onChange={(e) => setCofounderNames(cofounderNames.map((n, idx) => (idx === i ? e.target.value : n)))}
                      placeholder="e.g. Jordan Lee"
                      className={inputClass}
                    />
                    {i > 0 && (
                      <button type="button" aria-label={`Remove co-founder ${i + 1}`} onClick={() => setCofounderNames(cofounderNames.filter((_, idx) => idx !== i))} className={buttonQuiet}>
                        Remove
                      </button>
                    )}
                  </div>
                </Field>
              ))}
              <button type="button" onClick={() => setCofounderNames([...cofounderNames, ""])} className={buttonQuiet}>
                Add another founder
              </button>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <>
          {text("venture", "Venture name", "A working name is fine")}
          <Field id="oneLiner" label="What it does, in one sentence" error={err.oneLiner}>
            <input id="oneLiner" name="oneLiner" defaultValue={v.oneLiner} placeholder="e.g. Scheduling software for small home-care agencies" className={inputClass} aria-invalid={!!err.oneLiner} aria-describedby={err.oneLiner ? "oneLiner-error" : undefined} />
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="stillWorking" defaultChecked={v.stillWorking === "on"} /> Still working on it
            </label>
          </Field>
          {text("website", "Website", "e.g. lantern.app", { optional: true })}
          {text("industry", "Industry", "e.g. Home healthcare")}
          <Field id="businessModel" label="Business type" error={err.businessModel}>
            <select id="businessModel" name="businessModel" defaultValue={v.businessModel} className={inputClass} aria-invalid={!!err.businessModel} aria-describedby={err.businessModel ? "businessModel-error" : undefined}>
              <option value="">Choose one</option>
              {MODELS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          {text("startedOn", "Month you started working on it", "YYYY-MM, e.g. 2026-03", { type: "month" })}
        </>
      )}

      {step === 3 && (
        <>
          <Choice name="stage" legend="Stage" options={STAGES} value={v.stage} error={err.stage} />
          <Choice name="evidence" legend="Strongest evidence so far" options={EVIDENCE} value={v.evidence} error={err.evidence} />
        </>
      )}

      {step === 4 && (
        <>
          {text("targetCustomer", "Who you think the customer is", "e.g. Owners of home-care agencies with 10–50 caregivers", { optional: true })}
          {text("problem", "The problem you solve, in one sentence", "e.g. Owners rebuild caregiver schedules by hand every week")}
          <Field id="outcome30" label="What you want to be true in 30 days" error={err.outcome30}>
            <textarea id="outcome30" name="outcome30" rows={2} defaultValue={v.outcome30} placeholder="e.g. Five agency owners agree to a paid pilot" className={inputClass} aria-invalid={!!err.outcome30} aria-describedby={err.outcome30 ? "outcome30-error" : undefined} />
          </Field>
          <div className="max-w-48">{text("hoursPerWeek", "Hours per week you can give it", "e.g. 10", { type: "number" })}</div>
          <fieldset className="space-y-3 rounded-lg border border-line p-4">
            <legend className="px-1 text-sm font-medium text-ink">Program (optional)</legend>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="inProgram" defaultChecked={inProgram} onChange={(e) => setInProgram(e.target.checked)} /> I&apos;m in an accelerator, incubator or cohort
            </label>
            {inProgram && (
              <div className="grid gap-4 sm:grid-cols-3">
                {text("programTitle", "Program name", "e.g. Spring Founders Cohort")}
                {text("programStart", "Start date", "", { type: "date" })}
                {text("programWeeks", "Weeks", "e.g. 10", { type: "number" })}
              </div>
            )}
          </fieldset>
        </>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Saving…" : canJump ? "Save" : last ? "Save and see my first action" : "Save and continue"}
        </button>
        {step > 1 && (
          <Link href={`/setup?step=${step - 1}`} className={buttonQuiet}>
            Back
          </Link>
        )}
      </div>
    </form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

function Choice({
  name,
  legend,
  options,
  value,
  error,
  onChange,
}: {
  name: string;
  legend: string;
  options: readonly (readonly [string, string])[];
  value: string;
  error?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([optionValue, label]) => (
          <label key={optionValue} className="flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink has-[:checked]:border-teal-dark has-[:checked]:bg-aqua/40">
            <input type="radio" name={name} value={optionValue} defaultChecked={value === optionValue} onChange={() => onChange?.(optionValue)} /> {label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className={errorText}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
