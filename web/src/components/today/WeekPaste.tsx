"use client";

import { useActionState, useMemo, useState } from "react";
import { applyWeekUpdateAction } from "@/app/(workbook)/import/actions";
import { IGNORED_AFTER_BLOCK, ignoredAfterBlock, parseWeekBlock, weekPlanBlocked, weekPreviewRows, type WeekPlan } from "@/commands/paste-bridge";
import { buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

type Current = { blocker: string | null; help: string | null };

export function WeekPaste({ weekId, open, current }: { weekId: string; open: { id: string; text: string }[]; current: Current }) {
  const [text, setText] = useState("");
  const plan = useMemo(() => parseWeekBlock(text, open), [text, open]);
  const [state, formAction, pending] = useActionState(applyWeekUpdateAction, IDLE);
  if (state.status === "saved") return <p role="status" className="text-sm text-ink">{state.message ?? "Update applied. Today now shows it."}</p>;
  const blocked = !text.trim() || weekPlanBlocked(plan);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="week" value={weekId} />
      <label htmlFor="week-update" className="block text-sm font-medium text-ink">
        2. Paste your chat&apos;s update
      </label>
      <textarea id="week-update" name="update" rows={8} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} font-mono`} />
      {text.trim() && <WeekPreview plan={plan} current={current} ignored={ignoredAfterBlock(text, "founderive-week")} />}
      {/* Quiet on purpose: Today keeps one primary action, the next action. */}
      <button type="submit" disabled={pending || blocked} className={buttonQuiet}>
        {pending ? "Applying…" : "Apply the update"}
      </button>
      {text.trim() && weekPlanBlocked(plan) && <p className="text-sm text-muted">Nothing changes until the lines above are fixed and every open commitment is reviewed.</p>}
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function WeekPreview({ plan, current, ignored }: { plan: WeekPlan; current: Current; ignored: boolean }) {
  const rows = weekPreviewRows(plan, current);
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
      {ignored && <p className="mt-2 text-sm text-muted">{IGNORED_AFTER_BLOCK}</p>}
      {plan.notReviewed.length > 0 && (
        <p role="alert" className={`${errorText} mt-3`}>
          Every open commitment needs a kept, done or dropped line, so this answer may have been cut off. Ask your chat for the whole block again.
        </p>
      )}
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
