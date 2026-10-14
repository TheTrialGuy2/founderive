"use client";

import { useActionState } from "react";
import { saveCommitmentStatus, saveHomeworkStatus, saveNewCommitment } from "@/app/(workbook)/actions";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { dueWords } from "@/core/due";
import { IDLE, type ActionState } from "@/lib/action-state";
import { commitmentFields } from "@/lib/commitment-fields";
import { ActionButton } from "./ActionButton";

type Commitment = { id: string; text: string; due?: string | null; status: "open" | "done" | "dropped"; reason?: string | null; week?: string };
type Homework = { id: string; title: string; due?: string | null; status: "open" | "done" | "skipped"; skipReason?: string | null };
type Props = { weekId: string; today: string; commitments: Commitment[]; carried: (Commitment & { week: string })[]; programWeek: number | null; programLabel: string | null; homework: Homework[] };

const dueText = (due: string | null | undefined, today: string, week?: string) => dueWords({ due, week }, today) || null;

export function CommitmentList({ weekId, today, commitments, carried, programWeek, programLabel, homework }: Props) {
  // Open commitments from earlier weeks show here too, labelled with their week; they stay in that week's file.
  const open = [...commitments.filter((c) => c.status === "open"), ...carried];
  const closed = commitments.filter((c) => c.status !== "open");
  const openHomework = homework.filter((h) => h.status === "open");
  return (
    <div className="space-y-4">
      {open.length === 0 && openHomework.length === 0 && <p className="text-sm text-muted">No open commitments this week.</p>}
      <ul className="space-y-2">
        {open.map((c) => (
          <li key={`${c.week ?? weekId}:${c.id}`} className="rounded-lg border border-line p-3">
            {c.week && c.week !== weekId && <p className="text-xs font-medium text-teal-dark">From week {c.week}</p>}
            <p className="text-sm text-ink">{c.text}</p>
            {dueText(c.due, today, c.week) && <p className="text-xs text-muted">{dueText(c.due, today, c.week)}</p>}
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <ActionButton action={saveCommitmentStatus} fields={commitmentFields(c, weekId, "done")} label="Done" variant="quiet" />
              <ReasonForm action={saveCommitmentStatus} fields={commitmentFields(c, weekId, "dropped")} summary="Drop" submit="Drop it" />
            </div>
          </li>
        ))}
        {openHomework.map((h) => (
          <li key={h.id} className="rounded-lg border border-line p-3">
            <p className="text-xs font-medium text-teal-dark">{programLabel}</p>
            <p className="text-sm text-ink">{h.title}</p>
            {dueText(h.due, today) && <p className="text-xs text-muted">{dueText(h.due, today)}</p>}
            <div className="mt-2 flex flex-wrap items-start gap-2">
              <ActionButton action={saveHomeworkStatus} fields={{ programWeek: String(programWeek ?? ""), id: h.id, status: "done" }} label="Done" variant="quiet" />
              <ReasonForm action={saveHomeworkStatus} fields={{ programWeek: String(programWeek ?? ""), id: h.id, status: "skipped" }} summary="Skip" submit="Skip it" />
            </div>
          </li>
        ))}
      </ul>
      <AddCommitment weekId={weekId} />
      {closed.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Done or dropped · {closed.length}</summary>
          <ul className="mt-2 space-y-1">
            {closed.map((c) => (
              <li key={`${c.week ?? weekId}:${c.id}`} className="text-muted">
                {c.status === "done" ? "Done: " : "Dropped: "}
                {c.text}
                {c.reason ? ` (${c.reason})` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** A disclosure ("Drop", "Skip") holding a reason field and its submit. */
export function ReasonForm({ action, fields, summary, submit }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; fields: Record<string, string>; summary: string; submit: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <details>
      <summary className={`${buttonQuiet} cursor-pointer list-none`}>{summary}</summary>
      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label className="text-sm text-ink">
          Reason
          <input name="reason" defaultValue={state.values?.reason} className={`${inputClass} mt-1`} />
        </label>
        <button type="submit" disabled={pending} className={buttonQuiet}>
          {pending ? "Saving…" : submit}
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

function AddCommitment({ weekId }: { weekId: string }) {
  const [state, formAction, pending] = useActionState(saveNewCommitment, IDLE);
  return (
    // React resets the form after the action, so a saved commitment leaves the fields empty.
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="week" value={weekId} />
      <label className="min-w-48 flex-1 text-sm text-ink">
        New commitment
        <input name="text" defaultValue={state.values?.text} className={`${inputClass} mt-1`} />
      </label>
      <label className="text-sm text-ink">
        Due
        <input type="date" name="due" defaultValue={state.values?.due} className={`${inputClass} mt-1`} />
      </label>
      <button type="submit" disabled={pending} className={buttonQuiet}>
        {pending ? "Adding…" : "Add commitment"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
