"use client";

import Link from "next/link";
import { ProgressBar } from "@/components/ui";
import { BlockerForm } from "@/components/today/BlockerForm";
import { OutcomeForm } from "@/components/today/OutcomeForm";
import { ActionButton } from "@/components/today/ActionButton";
import { inputClass } from "@/components/workbook/form";
import { bumpOutreachAction, saveOutreachAction, saveTalkGoalAction } from "@/app/(workbook)/path/actions";
import { InlineForm } from "./InlineForm";
import type { KindData } from "@/store/schemas";

const tile = "rounded-xl border border-line bg-paper p-4";
const label = "text-[11px] font-semibold tracking-[0.08em] text-muted uppercase";

/** `stuck` adds the quiet way in to a blocker; it's left out when the blocker is already Home's main action. */
export function OutcomeTile({
  weekId,
  outcome,
  outcome30,
  goals,
  primary,
  stuck,
}: {
  weekId: string;
  outcome: string | null | undefined;
  outcome30?: string | null;
  goals?: KindData<"founder">["goals"];
  primary: boolean;
  stuck?: { blocker: string; help: string };
}) {
  const goalLabel = (id: string) => id.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
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
      {(outcome30 || (goals && goals.length > 0)) && (
        <div className="mt-3 border-t border-line pt-3 text-sm">
          {outcome30 && <><p className="text-muted">30-day outcome</p><p className="text-ink">{outcome30}</p></>}
          {goals && goals.length > 0 && (
            <p className="mt-1 text-muted">
              {goals.map((goal, index) => (
                <span key={goal.id}>
                  {index > 0 && " · "}
                  {goalLabel(goal.id)} {goal.count} of {goal.target}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
      {stuck && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-teal-dark">Stuck on something? Add a blocker or ask for help</summary>
          <div className="mt-2">
            <BlockerForm weekId={weekId} blocker={stuck.blocker} help={stuck.help} />
          </div>
        </details>
      )}
    </section>
  );
}

/** `importedWaiting` adds a quiet way to the imported conversations that don't count until the founder confirms them. */
export function TalkedToTile({ weekId, count, goal, lastWeekShort, importedWaiting = 0 }: { weekId: string; count: number; goal: number; lastWeekShort: number; importedWaiting?: number }) {
  return (
    <section className={tile} aria-labelledby="talked-heading">
      <h2 id="talked-heading" className={label}>
        People talked to
      </h2>
      <p className="mt-1 text-2xl font-semibold text-navy">
        {count} <span className="text-base font-normal text-muted">logged this week</span>
      </p>
      <div className="mt-2">
        <ProgressBar value={Math.min(count, goal)} max={goal} tone="navy" label="People talked to this week" />
      </div>
      <p className="mt-2 text-sm text-muted">Your goal: {goal}</p>
      {lastWeekShort > 0 && count === 0 && <p className="mt-1 text-sm text-ink">One conversation this week gets you going again.</p>}
      {importedWaiting > 0 && (
        <p className="mt-1 text-sm">
          <Link href="/people?show=imported" className="text-teal-dark hover:text-navy">
            {importedWaiting} imported, not confirmed yet
          </Link>
        </p>
      )}
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

export function OutreachTile({ weekId, outreach }: { weekId: string; outreach: KindData<"checkin">["outreach"] }) {
  const customer = outreach?.find((row) => row.audience === "customer") ?? { audience: "customer" as const, reached: 0, replied: 0 };
  const others = outreach?.filter((row) => row.audience !== "customer") ?? [];
  const audienceLabel = (audience: string) => audience[0].toUpperCase() + audience.slice(1);
  return (
    <section className={tile} aria-labelledby="outreach-heading">
      <h2 id="outreach-heading" className={label}>
        Outreach this week
      </h2>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="text-ink">
            Reached <span className="font-semibold">{customer.reached}</span>
          </span>
          <ActionButton action={bumpOutreachAction} fields={{ week: weekId, which: "reached", audience: "customer" }} label="+1" variant="quiet" ariaLabel="Add one customer to reached" />
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-ink">
            Replied <span className="font-semibold">{customer.replied}</span>
          </span>
          <ActionButton action={bumpOutreachAction} fields={{ week: weekId, which: "replied", audience: "customer" }} label="+1" variant="quiet" ariaLabel="Add one customer reply" />
        </li>
      </ul>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-teal-dark">Edit</summary>
        <InlineForm action={saveOutreachAction} fields={{ week: weekId, audience: "customer" }} submit="Save">
          {(v) => (
            <>
              <label className="text-sm text-ink">
                Reached
                <input name="reached" type="number" min={0} defaultValue={v.reached ?? String(customer.reached)} className={`${inputClass} mt-1 w-20`} />
              </label>
              <label className="text-sm text-ink">
                Replied
                <input name="replied" type="number" min={0} defaultValue={v.replied ?? String(customer.replied)} className={`${inputClass} mt-1 w-20`} />
              </label>
            </>
          )}
        </InlineForm>
        {customer.replied > customer.reached && <p className="mt-1 text-xs text-muted">More replies than reach-outs is fine: people write to you first.</p>}
      </details>
      {others.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-teal-dark">Other audiences · {others.length}</summary>
          <ul className="mt-2 space-y-1 text-muted">
            {others.map((row) => (
              <li key={row.audience}>
                {audienceLabel(row.audience)} · {row.reached} reached, {row.replied} replied
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
