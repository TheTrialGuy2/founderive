"use client";

import { useActionState } from "react";
import { confirmAllImportedAction } from "@/app/(workbook)/people/actions";
import { buttonPrimary, errorText } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

const plural = (n: number) => `${n} conversation${n === 1 ? "" : "s"}`;

/**
 * The Imported filter's one main action. Its message stays after the list empties, so the founder sees what happened;
 * a file that couldn't be confirmed is named with what to fix.
 */
export function ConfirmAllImports({ count }: { count: number }) {
  const [state, formAction, pending] = useActionState(confirmAllImportedAction, IDLE);
  const confirmed = state.status === "saved" ? Number(state.result?.confirmed ?? 0) : 0;
  const failed: { path: string; error: string }[] = state.status === "saved" ? JSON.parse(state.result?.failed ?? "[]") : [];
  return (
    <div className="mb-4">
      {count > 0 && (
        <form action={formAction}>
          <button type="submit" disabled={pending} className={buttonPrimary}>
            {pending ? "Confirming…" : `Confirm all ${count}`}
          </button>
        </form>
      )}
      <div aria-live="polite">
        {state.status === "saved" && confirmed > 0 && <p className="mt-2 text-sm text-ink">Confirmed {plural(confirmed)}.</p>}
        {failed.length > 0 && (
          <div role="alert" className="mt-2 text-sm text-ink">
            <p>
              Couldn&apos;t confirm {plural(failed.length)}. Fix {failed.length === 1 ? "it" : "each one"}, then confirm again:
            </p>
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
