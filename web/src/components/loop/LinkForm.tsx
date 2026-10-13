"use client";

import { useActionState } from "react";
import { linkEvidenceAction } from "@/app/(workbook)/evidence-actions";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

type Props = {
  fixed: { name: "test" | "conversation"; value: string };
  choose: "test" | "conversation";
  label: string;
  submit: string;
  options: { value: string; label: string }[];
};

/** Links a conversation and a test as evidence, from either side. Hidden when there's nothing left to link. */
export function LinkForm({ fixed, choose, label, submit, options }: Props) {
  const [state, formAction, pending] = useActionState(linkEvidenceAction, IDLE);
  if (options.length === 0) return null;
  const id = `link-${choose}`;
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name={fixed.name} value={fixed.value} />
      <div className="min-w-56 flex-1">
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
        <select id={id} name={choose} defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose one
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className={buttonQuiet}>
        {pending ? "Linking…" : submit}
      </button>
      {state.status === "error" && (
        <p role="alert" className={`${errorText} w-full`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
