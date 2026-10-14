"use client";

import { planConversationAction } from "@/app/(workbook)/path/actions";
import { InlineForm } from "@/components/home/InlineForm";
import { buttonQuiet, inputClass } from "@/components/workbook/form";

/**
 * A quiet "Plan a conversation" disclosure on People: who, which day and which step it's about (Customer unless the
 * founder picks another). It's saved as a commitment in this week's check-in, so it shows on Home with its day.
 */
export function PlanConversation({ weekId, tomorrow, steps }: { weekId: string; tomorrow: string; steps: [string, string][] }) {
  const fallback = steps.some(([id]) => id === "customer") ? "customer" : (steps[0]?.[0] ?? "");
  return (
    <details className="mt-3 text-sm">
      <summary className={`${buttonQuiet} cursor-pointer list-none`}>Plan a conversation</summary>
      <p className="mt-2 text-muted">A first name, a role, or &quot;someone who…&quot; is enough. It shows on Home on the day you pick.</p>
      <InlineForm action={planConversationAction} fields={{ week: weekId }} submit="Plan it">
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
            <label className="text-sm text-ink">
              About
              <select name="id" defaultValue={v.id ?? fallback} className={`${inputClass} mt-1`}>
                {steps.map(([id, title]) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </InlineForm>
    </details>
  );
}
