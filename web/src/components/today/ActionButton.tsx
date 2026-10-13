"use client";

import { useActionState } from "react";
import { buttonPrimary, buttonQuiet, errorText } from "@/components/workbook/form";
import { IDLE, type ActionState } from "@/lib/action-state";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** A one-click form: hidden fields plus a button. Shows the error inline if the save fails. */
export function ActionButton({ action, fields, label, variant = "primary" }: { action: Action; fields: Record<string, string>; label: string; variant?: "primary" | "quiet" }) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="inline-block">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className={variant === "primary" ? buttonPrimary : buttonQuiet}>
        {pending ? "Saving…" : label}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
