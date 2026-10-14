"use client";

import Link from "next/link";
import { planConversationAction } from "@/app/(workbook)/path/actions";
import { InlineForm } from "@/components/home/InlineForm";
import { buttonPrimary, inputClass } from "@/components/workbook/form";
import type { PathStep } from "@/core/path";

/** The step page's one main action: plan a conversation, log the one you planned, or log someone you talked to. */
export function StepAction({ step, weekId, tomorrow }: { step: PathStep; weekId: string; tomorrow: string }) {
  const logHref = `/conversations/new?step=${step.id}`;
  if (step.planned === 0 && step.discussed === 0) {
    return (
      <div className="mt-4">
        <p className="font-semibold text-navy">Plan one conversation</p>
        <p className="mt-1 text-sm text-muted">Who could you talk to about {step.title.toLowerCase()} this week? A first name, a role, or &quot;someone who…&quot; is enough.</p>
        <InlineForm action={planConversationAction} fields={{ week: weekId, id: step.id }} submit="Plan one conversation" primary>
          {(v) => (
            <>
              <label className="min-w-48 flex-1 text-sm text-ink">
                Who
                <input name="who" defaultValue={v.who} placeholder="e.g. an agency owner from the meetup" className={`${inputClass} mt-1`} />
              </label>
              <label className="text-sm text-ink">
                Day
                <input type="date" name="due" defaultValue={v.due ?? tomorrow} className={`${inputClass} mt-1`} />
              </label>
            </>
          )}
        </InlineForm>
        <p className="mt-3 text-sm text-muted">
          Already talked to someone?{" "}
          <Link href={logHref} className="font-medium text-teal-dark hover:text-navy">
            Log it
          </Link>
        </p>
      </div>
    );
  }
  return (
    <Link href={logHref} className={`${buttonPrimary} mt-4`}>
      {step.planned > 0 ? "Log the conversation" : "Log someone you talked to"}
    </Link>
  );
}
