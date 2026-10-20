import Link from "next/link";
import { saveCommitmentStatus, saveHomeworkStatus } from "@/app/(workbook)/actions";
import { setFollowUpStatusAction } from "@/app/(workbook)/conversations/actions";
import { ActionButton } from "@/components/today/ActionButton";
import { CommitmentList } from "@/components/today/CommitmentList";
import { dueWords, type DueItem } from "@/core/due";
import { commitmentFields } from "@/lib/commitment-fields";
import type { KindData } from "@/store/schemas";
import { buttonPrimary, buttonQuiet } from "@/components/workbook/form";

type Props = {
  weekId: string;
  today: string;
  items: DueItem[];
  primaryKey: string | null; // the item that is Home's main action (past its date), if any
  commitments: KindData<"checkin">["commitments"];
  carried: (KindData<"checkin">["commitments"][number] & { week: string })[];
  programWeek: number | null;
  programLabel: string | null;
  homework: KindData<"week">["homework"];
};

/** What Done sends for each kind of item: a commitment to its own week's check-in, homework to its program week, a follow-up to its conversation. A decision and a revisit have no Done here; they link to the decision's card. */
function doneAction(i: DueItem, weekId: string, programWeek: number | null): { action: typeof saveCommitmentStatus; fields: Record<string, string> } | null {
  if (i.kind === "decision" || i.kind === "revisit") return null;
  if (i.kind === "commitment") return { action: saveCommitmentStatus, fields: commitmentFields({ id: i.id, week: i.week ?? weekId }, weekId, "done") };
  if (i.kind === "followup") {
    const at = i.id.lastIndexOf("#");
    return { action: setFollowUpStatusAction, fields: { path: i.id.slice(0, at), id: i.id.slice(at + 1), status: "done" } };
  }
  return { action: saveHomeworkStatus, fields: { programWeek: String(programWeek ?? ""), id: i.id, status: "done" } };
}

/** Up to three things due, soonest first, with Done. "See all" opens the full list in place, with Drop and Skip. */
export function DueList({ weekId, today, items, primaryKey, commitments, carried, programWeek, programLabel, homework }: Props) {
  const top = items.slice(0, 3);
  return (
    <section aria-labelledby="due-heading" className="rounded-xl border border-line bg-paper p-4">
      <h2 id="due-heading" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        Due
      </h2>
      {top.length === 0 ? (
        <>
          <p className="mt-2 text-sm text-muted">Nothing due. Commitments you make show here, and so does program homework.</p>
          <p className="mt-1 text-sm text-muted">Or tell Claude: &quot;I&apos;ll call two agency owners by Friday.&quot;</p>
        </>
      ) : (
        <ul className="mt-2 space-y-2">
          {top.map((i) => {
            const done = doneAction(i, weekId, programWeek);
            return (
              <li key={i.key} className="flex items-start justify-between gap-3">
                <span className="text-sm text-ink">
                  {i.href ? (
                    <Link href={i.href} className="font-medium text-teal-dark underline-offset-2 hover:underline">
                      {i.text}
                    </Link>
                  ) : (
                    i.text
                  )}
                  {dueWords(i, today) && <span className="text-muted"> · {dueWords(i, today)}</span>}
                  {/* Where a commitment came from: the record it was made on. Quiet, under the text; the commitment itself stays plain. */}
                  {i.source && (
                    <Link href={i.source.href} className="mt-0.5 block text-xs font-medium text-teal-dark underline-offset-2 hover:underline">
                      {i.source.label}
                    </Link>
                  )}
                </span>
                {done ? (
                  <ActionButton action={done.action} fields={done.fields} label="Done" variant={i.key === primaryKey ? "primary" : "quiet"} ariaLabel={`Done: ${i.text}`} />
                ) : (
                  <Link href={i.href ?? "/decisions"} className={i.key === primaryKey ? buttonPrimary : buttonQuiet}>
                    {i.kind === "revisit" ? "Say what happened" : "Decide"}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-teal-dark">See all{items.length > 3 ? ` · ${items.length}` : ""}</summary>
        <div className="mt-3">
          <CommitmentList weekId={weekId} today={today} commitments={commitments} carried={carried} programWeek={programWeek} programLabel={programLabel} homework={homework} />
        </div>
      </details>
    </section>
  );
}
