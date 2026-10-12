"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";

export type CheckState = "open" | "done" | "auto" | "skipped";

/** A habit-style row: tap the circle to complete. Auto-completed items show an "auto" tick. */
export function CheckRow({
  state,
  title,
  meta,
  right,
  onCheck,
  href,
}: {
  state: CheckState;
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  onCheck?: () => void;
  href?: string;
}) {
  const closed = state !== "open";
  const circle = (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm transition ${
        state === "done"
          ? "bg-navy text-white"
          : state === "auto"
            ? "bg-lime text-navy"
            : state === "skipped"
              ? "border-2 border-dashed border-line text-muted"
              : "border-2 border-navy/30 hover:border-navy hover:bg-lime-soft"
      }`}
      aria-hidden
    >
      {state === "done" || state === "auto" ? <Icon name="check" size={16} /> : state === "skipped" ? <Icon name="skip" size={16} /> : null}
    </span>
  );
  const label = state === "open" ? "Mark done" : state === "skipped" ? "Skipped" : "Done";

  return (
    <li className="flex items-center gap-3 py-2.5">
      {href && state === "open" ? (
        <Link href={href} aria-label={label}>
          {circle}
        </Link>
      ) : (
        <button type="button" onClick={onCheck} disabled={!onCheck} aria-label={label} className="disabled:cursor-default">
          {circle}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${closed ? "text-muted line-through decoration-line" : ""}`}>{title}</p>
        {(meta || state === "auto") && (
          <p className="mt-0.5 text-xs text-muted">
            {state === "auto" && <span className="mr-1 rounded bg-lime px-1 font-medium text-navy">auto</span>}
            {meta}
          </p>
        )}
      </div>
      {right}
    </li>
  );
}
