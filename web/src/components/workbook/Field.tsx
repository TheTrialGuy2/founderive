import type { ReactNode } from "react";
import { errorText } from "./form";

/** The ids an input should point at with aria-describedby: its hint and its error, when present. */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

/** A visible label, an optional hint, the input, and its error underneath. */
export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}

/** The form-level error: what happened and what to do. */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-coral bg-coral-soft/60 p-3 text-sm text-ink">
      {message}
    </p>
  );
}
