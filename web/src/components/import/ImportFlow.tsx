"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createImportAction } from "@/app/(workbook)/import/actions";
import type { ImportItem, ImportResult } from "@/commands/import";
import { describeDraft, parseImportBlock } from "@/commands/paste-bridge";
import { buttonPrimary, buttonQuiet, errorText, inputClass } from "@/components/workbook/form";
import { hrefFor } from "@/core/slug";
import { IDLE } from "@/lib/action-state";

export function ImportFlow({ blocks }: { blocks: { id: string; title: string }[] }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseImportBlock(text, blocks), [text, blocks]);
  const [state, formAction, pending] = useActionState(createImportAction, IDLE);
  if (state.status === "saved" && state.result?.json) {
    const result = JSON.parse(state.result.json) as ImportResult;
    const failed = result.items.some((x) => x.status === "failed");
    return (
      <div className="space-y-4">
        <ImportDone result={result} />
        {failed && (
          // Same block again: drafts already created are skipped, so only the failed ones are tried.
          <form action={formAction}>
            <input type="hidden" name="answer" value={text} />
            <button type="submit" disabled={pending} className={buttonPrimary}>
              {pending ? "Trying again…" : "Try the failed ones again"}
            </button>
          </form>
        )}
      </div>
    );
  }
  const blocked = parsed.errors.length > 0 || parsed.drafts.length === 0;
  return (
    <form action={formAction} className="max-w-3xl space-y-4">
      <label htmlFor="answer" className="block text-sm font-medium text-ink">
        2. Paste your chat&apos;s answer
      </label>
      <textarea id="answer" name="answer" rows={14} value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} font-mono`} />
      {text.trim() && (
        <section aria-labelledby="preview-heading" className="rounded-lg border border-line bg-paper p-4">
          <h2 id="preview-heading" className="font-semibold text-navy">
            What will be created
          </h2>
          {parsed.drafts.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
              {parsed.drafts.map((d, i) => (
                <li key={i}>{describeDraft(d)}</li>
              ))}
            </ul>
          )}
          {parsed.errors.length > 0 && (
            <div role="alert" className="mt-3">
              <p className="text-sm font-semibold text-[#8a2d1c]">Fix these lines first. Nothing is created until they&apos;re fixed:</p>
              <ul className={`${errorText} list-disc space-y-1 pl-5`}>
                {parsed.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Everything is created as a draft marked &quot;Imported — confirm&quot;. Nothing you&apos;ve already written is overwritten.</p>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || blocked} className={buttonPrimary}>
          {pending ? "Creating…" : "Create drafts"}
        </button>
        <Link href="/today" className={buttonQuiet}>
          Skip for now
        </Link>
      </div>
      {blocked && <p className="text-sm text-muted">{text.trim() ? "Create drafts turns on when the preview has something to create and no lines to fix." : "Paste the answer to see what will be created."}</p>}
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}

/** The row's verdict in words: Created, Already imported, Kept yours, or Failed (with the reason after it). */
function statusText(item: ImportItem): string {
  if (item.status === "created") return "Created";
  if (item.status === "failed") return "Failed";
  return item.detail === "Already imported." ? "Already imported" : "Kept yours";
}

function ImportDone({ result }: { result: ImportResult }) {
  return (
    <div role="status" className="max-w-3xl space-y-5 rounded-xl border border-line bg-paper p-5">
      <p className="font-semibold text-navy">Import done. Each new draft says &quot;Imported — confirm&quot; until you check it.</p>
      <ul className="space-y-1 text-sm">
        {result.items.map((item, i) => (
          <li key={i} className={item.status === "failed" ? "text-[#8a2d1c]" : "text-ink"}>
            <span className="font-medium">{statusText(item)}: </span>
            {item.status !== "failed" && item.path ? (
              <Link href={hrefFor(item.path) ?? "/today"} className="font-medium text-teal-dark hover:text-navy">
                {item.label}
              </Link>
            ) : (
              item.label
            )}
            {item.detail && <span className="text-muted"> · {item.detail}</span>}
          </li>
        ))}
      </ul>
      {result.assumptions.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink">Assumptions to turn into tests</p>
          <p className="text-xs text-muted">A test needs success and failure criteria before it starts, so these weren&apos;t saved yet.</p>
          <ul className="mt-1 space-y-1 text-sm">
            {result.assumptions.map((a, i) => (
              <li key={i}>
                {a.belief}{" "}
                <Link
                  href={`/tests/new?${new URLSearchParams({ belief: a.belief, ...(a.risk ? { risk: a.risk } : {}) }).toString()}`}
                  className="font-medium text-teal-dark hover:text-navy"
                >
                  Turn this into a test
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link href="/today" className={buttonQuiet}>
        Go to Today
      </Link>
    </div>
  );
}
