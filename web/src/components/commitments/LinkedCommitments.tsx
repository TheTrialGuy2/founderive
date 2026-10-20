import type { LinkedCommitment } from "@/core/commitment-source";
import { dueWords } from "@/core/due";

/**
 * What was promised because of this record, read-only: open first with due words, then done and dropped under a
 * disclosure. Renders nothing when there is nothing to list, so a record with no commitments shows no empty card.
 * Done and Drop stay on Home.
 */
export function LinkedCommitments({ commitments, today }: { commitments: LinkedCommitment[]; today: string }) {
  if (commitments.length === 0) return null;
  const open = commitments.filter((c) => c.status === "open");
  const closed = commitments.filter((c) => c.status !== "open");
  return (
    <div className="space-y-2 text-sm">
      {open.length > 0 && (
        <ul className="space-y-1">
          {open.map((c) => {
            const when = dueWords({ due: c.due, week: c.week }, today);
            return (
              <li key={`${c.week}:${c.id}`} className="text-ink">
                {c.text}
                {when && <span className="text-muted"> · {when}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {closed.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted">Done or dropped · {closed.length}</summary>
          <ul className="mt-1 space-y-1">
            {closed.map((c) => (
              <li key={`${c.week}:${c.id}`} className="text-muted">
                {c.status === "done" ? "Done: " : "Dropped: "}
                {c.text}
                {c.status === "dropped" && c.reason ? ` · ${c.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
