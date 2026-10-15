"use client";

import { reviewAgentEditAction } from "@/app/(workbook)/actions";
import { ActionButton } from "@/components/today/ActionButton";
import { Badge, formatDate } from "@/components/ui";

export function AgentEditReview({ kind, path, date, summary, previous, current }: { kind: "canvasBlock" | "conversation"; path: string; date: string; summary: string; previous: string; current: string }) {
  return (
    <section aria-label="Agent edit waiting for review" className="mb-6 rounded-lg border border-line bg-sand/60 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="warn">Edited by your agent</Badge>
        <span className="text-muted">{formatDate(date)}</span>
      </div>
      <p className="mt-2 font-medium text-ink">{summary}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div><p className="text-xs font-medium text-muted">Before</p><p className="mt-1 whitespace-pre-wrap rounded-md bg-paper p-3 text-ink">{previous || "Nothing recorded"}</p></div>
        <div><p className="text-xs font-medium text-muted">Agent edit</p><p className="mt-1 whitespace-pre-wrap rounded-md bg-paper p-3 text-ink">{current || "Nothing recorded"}</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton action={reviewAgentEditAction} fields={{ kind, path, choice: "keep" }} label="Keep edit" variant="primary" />
        <ActionButton action={reviewAgentEditAction} fields={{ kind, path, choice: "revert" }} label="Revert edit" variant="quiet" />
      </div>
    </section>
  );
}
