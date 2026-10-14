"use client";

import Link from "next/link";
import { chooseFocusAction } from "@/app/(workbook)/path/actions";
import { buttonPrimary, buttonQuiet, inputClass } from "@/components/workbook/form";
import type { HomeAction } from "@/core/home";
import type { PathView } from "@/core/path";
import { InlineForm } from "./InlineForm";
import { ViewSwitch } from "./ViewSwitch";

const people = (n: number) => (n === 0 ? "Not discussed yet" : `${n} ${n === 1 ? "person" : "people"} discussed this`);

export function PathList({ path, action, weekId }: { path: PathView; action: HomeAction | null; weekId: string }) {
  const stepIsMain = action?.kind === "step";
  return (
    <section aria-labelledby="path-heading" className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="path-heading" className="font-semibold text-navy">
          Your path <span className="ml-2 text-sm font-normal text-muted">{path.allDone ? "All steps done" : `${path.doneCount} of ${path.total} done`}</span>
        </h2>
        <ViewSwitch current="list" />
      </div>
      {action?.kind === "focus" && (
        <div id="focus" className="mb-4 rounded-xl border border-line bg-paper p-4">
          <p className="text-sm text-ink">Every step is done. Pick one to deepen this week.</p>
          <InlineForm action={chooseFocusAction} fields={{ week: weekId }} submit="Choose this week's focus" primary>
            {(v) => (
              <label className="text-sm text-ink">
                Step
                <select name="step" defaultValue={v.step ?? ""} className={`${inputClass} mt-1`}>
                  {path.steps
                    .filter((s) => s.id !== "you")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                </select>
              </label>
            )}
          </InlineForm>
        </div>
      )}
      <ol className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
        {path.steps.map((s, i) => {
          const isCurrent = path.current?.id === s.id;
          return (
            <li key={s.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${isCurrent ? "bg-aqua/30" : ""}`}>
              <span className="w-6 text-sm text-muted" aria-hidden>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <Link href={s.href} className="font-medium text-navy hover:text-teal-dark">
                  {s.title}
                </Link>
                <span className="block text-sm text-muted">{s.meaning}</span>
              </span>
              {s.id !== "you" && <span className="text-xs text-muted">{s.tested ? "Tested · supported" : people(s.discussed)}</span>}
              <span className="w-16 text-right text-xs font-semibold text-navy">{s.done ? "Done" : isCurrent ? "Current" : ""}</span>
              {isCurrent && action?.kind === "step" && (
                <Link href={action.href} className={stepIsMain ? buttonPrimary : buttonQuiet}>
                  {action.label}
                </Link>
              )}
              {isCurrent && action?.kind !== "step" && (
                <Link href={s.href} className={buttonQuiet}>
                  Continue: {s.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
