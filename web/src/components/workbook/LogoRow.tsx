"use client";

import { useActionState, useRef, useState } from "react";
import { removeLogoAction, saveLogoAction } from "@/app/(workbook)/actions";
import { ActionButton } from "@/components/today/ActionButton";
import { buttonQuiet, errorText } from "@/components/workbook/form";
import { isLogoTooBig, LOGO_TOO_BIG_MESSAGE } from "@/core/logo";
import { IDLE } from "@/lib/action-state";

/**
 * The You page's logo row: a thumbnail (when there's a live file) plus quiet Add/Change and Remove controls.
 * Add/Change opens the file picker; choosing a file within the size limit saves it straight away.
 * `hasLogo` and `cacheBust` both come from the server page's `logoVersion()` (the file's mtime, or null when
 * there's no file on disk) rather than from founder.logo alone, so a record that points at a missing file shows
 * "Not set" instead of a broken image.
 */
export function LogoRow({ hasLogo, venture, cacheBust }: { hasLogo: boolean; venture: string; cacheBust: number }) {
  const [state, formAction, pending] = useActionState(saveLogoAction, IDLE);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const message = tooBig ?? (state.status === "error" ? state.message : null);
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <dt className="w-36 text-sm text-muted">Logo</dt>
      <dd className="flex flex-1 flex-wrap items-center gap-3 text-ink">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local founder-data file served by our own /api/logo route; next/image's optimizer isn't needed for a local file.
          <img src={`/api/logo?v=${cacheBust}`} alt={`${venture} logo`} className="h-10 w-auto rounded" />
        ) : (
          <span className="text-muted">Not set</span>
        )}
        <form ref={formRef} action={formAction}>
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (isLogoTooBig(file.size)) {
                e.target.value = "";
                setTooBig(LOGO_TOO_BIG_MESSAGE);
                return;
              }
              setTooBig(null);
              formRef.current?.requestSubmit();
            }}
          />
          <button type="button" className={buttonQuiet} disabled={pending} aria-describedby="logo-row-hint" onClick={() => inputRef.current?.click()}>
            {pending ? "Saving…" : hasLogo ? "Change" : "Add logo"}
          </button>
        </form>
        {hasLogo && <ActionButton action={removeLogoAction} fields={{}} label="Remove" variant="quiet" />}
        <p id="logo-row-hint" className="w-full text-xs text-muted">
          PNG, JPG or WebP, up to 1 MB.
        </p>
        {message && (
          <p role="alert" className={`${errorText} w-full`}>
            {message}
          </p>
        )}
      </dd>
    </div>
  );
}
