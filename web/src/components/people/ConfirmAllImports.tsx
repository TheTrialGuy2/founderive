"use client";

import { useActionState } from "react";
import { confirmAllImportedAction } from "@/app/(workbook)/people/actions";
import { buttonPrimary, errorText } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

const plural = (n: number) => `${n} conversation${n === 1 ? "" : "s"}`;

/**
 * The Imported filter's one main action. It sends the paths the founder sees listed, so an import that lands after
 * the page loaded isn't confirmed unseen. Its message stays after the list empties; a file that turned unreadable is
 * pointed to the "Imported files to fix" list rather than listed twice, and a file that couldn't be saved is named.
 */
export function ConfirmAllImports({ paths }: { paths: string[] }) {
  const [state, formAction, pending] = useActionState(confirmAllImportedAction, IDLE);
  const saved = state.status === "saved";
  const confirmed = saved ? Number(state.result?.confirmed ?? 0) : 0;
  const broken = saved ? Number(state.result?.broken ?? 0) : 0;
  const failed: { path: string; error: string }[] = saved ? JSON.parse(state.result?.failed ?? "[]") : [];
  return (
    <div className="mb-4">
      {paths.length > 0 && (
        <form action={formAction}>
          {paths.map((p) => (
            <input key={p} type="hidden" name="path" value={p} />
          ))}
          <button type="submit" disabled={pending} className={buttonPrimary}>
            {pending ? "Confirming…" : `Confirm all ${paths.length}`}
          </button>
        </form>
      )}
      <div aria-live="polite">
        {confirmed > 0 && <p className="mt-2 text-sm text-ink">Confirmed {plural(confirmed)}.</p>}
        {broken > 0 && (
          <p role="alert" className="mt-2 text-sm text-ink">
            Couldn&apos;t confirm {broken} — {broken === 1 ? "it's" : "they're"} listed below under Imported files to fix.
          </p>
        )}
        {failed.length > 0 && (
          <div role="alert" className="mt-2 text-sm text-ink">
            <p>Couldn&apos;t save {plural(failed.length)}. Try again:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {failed.map((f) => (
                <li key={f.path}>
                  <span className="font-mono text-xs">founder-data/{f.path}</span>: {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </div>
  );
}
