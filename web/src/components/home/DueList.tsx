import { saveCommitmentStatus, saveHomeworkStatus } from "@/app/(workbook)/actions";
import { ActionButton } from "@/components/today/ActionButton";
import { CommitmentList } from "@/components/today/CommitmentList";
import { dueWords, type DueItem } from "@/core/due";
import { commitmentFields } from "@/lib/commitment-fields";
import type { KindData } from "@/store/schemas";

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

/** Up to three things due, soonest first, with Done. "See all" opens the full list in place, with Drop and Skip. */
export function DueList({ weekId, today, items, primaryKey, commitments, carried, programWeek, programLabel, homework }: Props) {
  const top = items.slice(0, 3);
  return (
    <section aria-labelledby="due-heading" className="rounded-xl border border-line bg-paper p-4">
      <h2 id="due-heading" className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        Due
      </h2>
      {top.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing due. Add a commitment under See all.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {top.map((i) => {
            const fields =
              i.kind === "commitment"
                ? commitmentFields({ id: i.id, week: i.week ?? weekId }, weekId, "done")
                : { programWeek: String(programWeek ?? ""), id: i.id, status: "done" };
            return (
              <li key={i.key} className="flex items-start justify-between gap-3">
                <span className="text-sm text-ink">
                  {i.text}
                  {dueWords(i, today) && <span className="text-muted"> · {dueWords(i, today)}</span>}
                </span>
                <ActionButton
                  action={i.kind === "commitment" ? saveCommitmentStatus : saveHomeworkStatus}
                  fields={fields}
                  label="Done"
                  variant={i.key === primaryKey ? "primary" : "quiet"}
                  ariaLabel={`Done: ${i.text}`}
                />
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
