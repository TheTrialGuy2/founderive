"use client";

import { useActionState, useMemo, useState } from "react";
import { applyWeekUpdateAction } from "@/app/(workbook)/import/actions";
import { parseWeekBlock, type WeekPlan } from "@/commands/paste-bridge";
import { buttonPrimary, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function WeekPaste({ weekId, open }: { weekId: string; open: { id: string; text: string }[] }) {
  const [text, setText] = useState("");
  const plan = useMemo(() => parseWeekBlock(text, open), [text, open]);
  const [state, formAction, pending] = useActionState(applyWeekUpdateAction, IDLE);
  if (state.status === "saved") return <p role="status" className="text-sm text-ink">Update applied. Today now shows it.</p>;
  const blocked = !text.trim() || plan.errors.length > 0;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="week" value={weekId} />
      <label htmlFor="week-update" className="block text-sm font-medium text-ink">
        2. Paste your chat&apos;s update
      </label>
      <textarea id="week-update" name="update" rows={8} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} font-mono`} />
      {text.trim() && <WeekPreview plan={plan} />}
      <button type="submit" disabled={pending || blocked} className={buttonPrimary}>
        {pending ? "Applying…" : "Apply the update"}
      </button>
      {text.trim() && plan.errors.length > 0 && <p className="text-sm text-muted">Nothing changes until the lines above are fixed.</p>}
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function WeekPreview({ plan }: { plan: WeekPlan }) {
  const rows: string[] = [
    plan.outcome ? `Outcome → ${plan.outcome}` : "Outcome: keeps the current one",
    ...plan.done.map((c) => `Done: ${c.text}`),
    ...plan.dropped.map((c) => `Dropped: ${c.text} (${c.reason})`),
    ...plan.kept.map((c) => `Still going: ${c.text}`),
    ...plan.added.map((a) => `New: ${a.text}${a.due ? ` · due ${a.due}` : ""}`),
    plan.blocker ? `Blocker: ${plan.blocker}` : "Blocker will be cleared",
    plan.help ? `Help needed: ${plan.help}` : "Help request will be cleared",
    ...plan.notReviewed.map((c) => `Not reviewed: ${c.text}`),
  ];
  return (
    <section aria-labelledby="week-preview-heading" className="rounded-lg border border-line bg-paper p-4">
      <h3 id="week-preview-heading" className="font-semibold text-navy">
        What will change
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
        {rows.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      {plan.errors.length > 0 && (
        <div role="alert" className="mt-3">
          <p className="text-sm font-semibold text-[#8a2d1c]">Fix these lines. Nothing is applied until they&apos;re fixed:</p>
          <ul className={`${errorText} list-disc space-y-1 pl-5`}>
            {plan.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
