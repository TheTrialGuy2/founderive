"use client";

import { useActionState, type ReactNode } from "react";
import { buttonPrimary, buttonQuiet, errorText } from "@/components/workbook/form";
import { IDLE, type ActionState } from "@/lib/action-state";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** A small form: hidden fields, the inputs given as a render prop (so they can show what was typed after an error), a submit button and an inline error. */
export function InlineForm({
  action,
  fields,
  submit,
  primary = false,
  children,
}: {
  action: Action;
  fields: Record<string, string>;
  submit: string;
  primary?: boolean;
  children: (values: Record<string, string>) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children(state.values ?? {})}
      <button type="submit" disabled={pending} className={primary ? buttonPrimary : buttonQuiet}>
        {pending ? "Saving…" : submit}
      </button>
      {state.status === "error" && (
        <p role="alert" className={`${errorText} w-full`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
