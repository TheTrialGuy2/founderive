"use client";

import { useActionState } from "react";
import { addFollowUpAction, setFollowUpStatusAction } from "@/app/(workbook)/conversations/actions";
import { ActionButton } from "@/components/today/ActionButton";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { dueWords } from "@/core/due";
import { IDLE } from "@/lib/action-state";

type FollowUp = { id: string; text: string; due?: string | null; status: "open" | "done" };

export function FollowUps({ path, followUps, today }: { path: string; followUps: FollowUp[]; today: string }) {
  const open = followUps.filter((f) => f.status === "open");
  const done = followUps.filter((f) => f.status === "done");
  return (
    <div className="space-y-3">
      {followUps.length === 0 && <p className="text-sm text-muted">No follow-ups. Add one if you promised something.</p>}
      {open.length > 0 && (
        <ul className="space-y-2">
          {open.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3">
              <div>
                <p className="text-sm text-ink">{f.text}</p>
                {f.due && <p className="text-xs text-muted">{dueWords({ due: f.due }, today)}</p>}
              </div>
              <ActionButton action={setFollowUpStatusAction} fields={{ path, id: f.id, status: "done" }} label="Done" ariaLabel={`Done: ${f.text}`} variant="quiet" />
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Done · {done.length}</summary>
          <ul className="mt-2 space-y-1">
            {done.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-muted">
                <span>Done: {f.text}</span>
                <ActionButton action={setFollowUpStatusAction} fields={{ path, id: f.id, status: "open" }} label="Reopen" ariaLabel={`Reopen: ${f.text}`} variant="quiet" />
              </li>
            ))}
          </ul>
        </details>
      )}
      <AddFollowUp path={path} />
    </div>
  );
}

function AddFollowUp({ path }: { path: string }) {
  const [state, formAction, pending] = useActionState(addFollowUpAction, IDLE);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="path" value={path} />
      <label className="min-w-48 flex-1 text-sm text-ink">
        New follow-up
        <input name="text" defaultValue={state.values?.text} className={`${inputClass} mt-1`} />
      </label>
      <label className="text-sm text-ink">
        Due
        <input type="date" name="due" defaultValue={state.values?.due} className={`${inputClass} mt-1`} />
      </label>
      <button type="submit" disabled={pending} className={buttonQuiet}>
        {pending ? "Adding…" : "Add follow-up"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={`${errorText} w-full`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
