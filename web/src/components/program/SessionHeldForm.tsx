"use client";

import { useActionState } from "react";
import { markSessionHeldAction } from "@/app/(workbook)/program/actions";
import { FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function SessionHeldForm({ week, date }: { week: number; date: string }) {
  const [state, action, pending] = useActionState(markSessionHeldAction, IDLE);
  return (
    <form action={action} className="mt-4 max-w-xl space-y-3">
      <input type="hidden" name="week" value={week} />
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <label className="block text-sm text-ink">Held on<input name="date" type="date" defaultValue={state.values?.date ?? date} className={`${inputClass} mt-1 max-w-48`} /></label>
      <label className="block text-sm text-ink">Note (optional)<input name="note" defaultValue={state.values?.note} placeholder="What this session covered" className={`${inputClass} mt-1`} /></label>
      <button type="submit" disabled={pending} className={buttonPrimary}>{pending ? "Saving…" : "Mark session held"}</button>
    </form>
  );
}
