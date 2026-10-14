"use client";

import { ProgressBar } from "@/components/ui";
import { OutcomeForm } from "@/components/today/OutcomeForm";
import { ActionButton } from "@/components/today/ActionButton";
import { inputClass } from "@/components/workbook/form";
import { bumpOutreachAction, saveOutreachAction, saveTalkGoalAction } from "@/app/(workbook)/path/actions";
import { InlineForm } from "./InlineForm";

const tile = "rounded-xl border border-line bg-paper p-4";
const label = "text-[11px] font-semibold tracking-[0.08em] text-muted uppercase";

export function OutcomeTile({ weekId, outcome, primary }: { weekId: string; outcome: string | null | undefined; primary: boolean }) {
  return (
    <section className={tile} aria-labelledby="outcome-heading">
      <h2 id="outcome-heading" className={label}>
        This week
      </h2>
      {outcome ? (
        <>
          <p className="mt-1 text-ink">{outcome}</p>
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-teal-dark">Change</summary>
            <OutcomeForm weekId={weekId} initial={outcome} primary={false} />
          </details>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink">Set this week&apos;s outcome: the one thing you want to be true by Sunday.</p>
          {/* OutcomeForm renders its own submit; when this is the main action it's the page's only primary button. */}
          <OutcomeForm weekId={weekId} initial="" primary={primary} />
        </>
      )}
    </section>
  );
}

export function TalkedToTile({ weekId, count, goal, lastWeekShort }: { weekId: string; count: number; goal: number; lastWeekShort: number }) {
  return (
    <section className={tile} aria-labelledby="talked-heading">
      <h2 id="talked-heading" className={label}>
        People talked to
      </h2>
      <p className="mt-1 text-2xl font-semibold text-navy">
        {count} <span className="text-base font-normal text-muted">logged this week</span>
      </p>
      <div className="mt-2">
        <ProgressBar value={Math.min(count, goal)} max={goal} tone="navy" />
      </div>
      <p className="mt-2 text-sm text-muted">Your goal: {goal}</p>
      {lastWeekShort > 0 && count < goal && <p className="mt-1 text-sm text-ink">Last week came in {lastWeekShort} short. One conversation this week starts making it up.</p>}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-teal-dark">Change goal</summary>
        <InlineForm action={saveTalkGoalAction} fields={{ week: weekId }} submit="Save goal">
          {(v) => (
            <label className="text-sm text-ink">
              People this week
              <input name="goal" type="number" min={1} max={50} defaultValue={v.goal ?? String(goal)} className={`${inputClass} mt-1 w-24`} />
            </label>
          )}
        </InlineForm>
      </details>
    </section>
  );
}

export function OutreachTile({ weekId, reached, replied }: { weekId: string; reached: number; replied: number }) {
  return (
    <section className={tile} aria-labelledby="outreach-heading">
      <h2 id="outreach-heading" className={label}>
        Outreach this week
      </h2>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="text-ink">
            Reached <span className="font-semibold">{reached}</span>
          </span>
          <ActionButton action={bumpOutreachAction} fields={{ week: weekId, which: "reached" }} label="+1" variant="quiet" ariaLabel="Add one to reached" />
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-ink">
            Replied <span className="font-semibold">{replied}</span>
          </span>
          <ActionButton action={bumpOutreachAction} fields={{ week: weekId, which: "replied" }} label="+1" variant="quiet" ariaLabel="Add one to replied" />
        </li>
      </ul>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-teal-dark">Edit</summary>
        <InlineForm action={saveOutreachAction} fields={{ week: weekId }} submit="Save">
          {(v) => (
            <>
              <label className="text-sm text-ink">
                Reached
                <input name="reached" type="number" min={0} defaultValue={v.reached ?? String(reached)} className={`${inputClass} mt-1 w-20`} />
              </label>
              <label className="text-sm text-ink">
                Replied
                <input name="replied" type="number" min={0} defaultValue={v.replied ?? String(replied)} className={`${inputClass} mt-1 w-20`} />
              </label>
            </>
          )}
        </InlineForm>
        {replied > reached && <p className="mt-1 text-xs text-muted">More replies than reach-outs is fine: people write to you first.</p>}
      </details>
    </section>
  );
}
