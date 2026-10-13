"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addGuideStep, chooseNotNow, saveCommitmentStatus, saveHomeworkStatus } from "@/app/(workbook)/actions";
import { buttonPrimary, buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import type { Candidate } from "@/core/next-step";
import { IDLE } from "@/lib/action-state";
import { ActionButton } from "./ActionButton";
import { OutcomeForm } from "./OutcomeForm";

type Props = { action: Candidate; weekId: string; today: string; tomorrow: string; programWeek: number | null };

export function NextActionCard({ action, weekId, today, tomorrow, programWeek }: Props) {
  return (
    <section aria-labelledby="next-action-label" className="rounded-xl border border-teal/30 bg-paper p-6 shadow-sm">
      <p id="next-action-label" className="text-xs font-semibold tracking-[0.12em] text-teal-dark uppercase">
        Next action
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-navy">{action.label}</h2>
      <p className="mt-1 text-sm text-muted">
        <span className="font-medium text-ink">Why: </span>
        {action.reason}
      </p>
      <div className="mt-4">
        <Primary action={action} weekId={weekId} programWeek={programWeek} />
      </div>
      {action.kind !== "outcome" && action.kind !== "fix" && <NotNow action={action} weekId={weekId} today={today} tomorrow={tomorrow} />}
    </section>
  );
}

function Primary({ action, weekId, programWeek }: Omit<Props, "today" | "tomorrow">) {
  switch (action.kind) {
    case "outcome":
      return <OutcomeForm weekId={weekId} initial={action.suggestion ?? ""} />;
    case "commitment":
      return <ActionButton action={saveCommitmentStatus} fields={{ week: weekId, id: action.ref ?? "", status: "done" }} label="Mark it done" />;
    case "program":
      return <ActionButton action={saveHomeworkStatus} fields={{ programWeek: String(programWeek ?? ""), id: action.ref ?? "", status: "done" }} label="Mark it done" />;
    case "guide":
      return <ActionButton action={addGuideStep} fields={{ week: weekId, guideId: action.ref ?? "", text: action.label }} label="Add it to this week" />;
    case "blocker":
      return (
        <a href="#blocker" className={buttonPrimary}>
          Update your blocker
        </a>
      );
    case "fix":
      return <p className="font-mono text-xs text-ink">founder-data/{action.ref} · run pnpm check-data in web/ for details</p>;
    default:
      return action.href ? (
        <Link href={action.href} className={buttonPrimary}>
          Open it
        </Link>
      ) : null;
  }
}

function NotNow({ action, weekId, today, tomorrow }: { action: Candidate; weekId: string; today: string; tomorrow: string }) {
  const [state, formAction, pending] = useActionState(chooseNotNow, IDLE);
  const [choice, setChoice] = useState(state.values?.choice ?? "dismissed");
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer font-medium text-teal-dark">Not now</summary>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="week" value={weekId} />
        <input type="hidden" name="today" value={today} />
        <input type="hidden" name="actionId" value={action.id} />
        <input type="hidden" name="label" value={action.label} />
        <fieldset className="space-y-2">
          <legend className="sr-only">What to do instead</legend>
          {[
            ["dismissed", "Skip it this week"],
            ["deferred", "Remind me on a date"],
            ["replaced", "Do something else instead"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-ink">
              <input type="radio" name="choice" value={value} checked={choice === value} onChange={() => setChoice(value)} /> {label}
            </label>
          ))}
        </fieldset>
        {choice === "deferred" && (
          <label className="block text-ink">
            Remind me on
            <input type="date" name="until" min={tomorrow} defaultValue={state.values?.until} className={`${inputClass} mt-1 max-w-48`} />
          </label>
        )}
        {choice === "replaced" && (
          <label className="block text-ink">
            Instead I&apos;ll
            <input name="replacement" defaultValue={state.values?.replacement} className={`${inputClass} mt-1`} />
          </label>
        )}
        <label className="block text-ink">
          Reason
          <input name="reason" defaultValue={state.values?.reason} className={`${inputClass} mt-1`} />
        </label>
        <button type="submit" disabled={pending} className={buttonQuiet}>
          {pending ? "Saving…" : "Save my choice"}
        </button>
        {state.status === "error" && (
          <p role="alert" className={errorText}>
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
