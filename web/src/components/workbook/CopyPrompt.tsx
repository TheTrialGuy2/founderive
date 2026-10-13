"use client";

import { useId, useState, type ReactNode } from "react";
import { defaultFamily, type PromptFamily } from "@/lib/prompts";
import { buttonQuiet } from "./form";

type Family = PromptFamily;
const LABELS: Record<Family, string> = {
  fileChat: "My AI can edit files on this computer",
  pasteBridge: "I use ChatGPT or Claude in the browser",
};

/**
 * A ready prompt for the founder's AI, in whichever family fits how they use it (spec §5a first-run states). The
 * family's label is always shown, even when only one is offered. `after` adds something under one family's prompt,
 * such as where to paste the browser chat's answer.
 */
export function CopyPrompt({
  prompts,
  title = "Or ask your AI",
  after = {},
  preferred,
}: {
  prompts: { fileChat?: string; pasteBridge?: string };
  title?: string;
  after?: Partial<Record<Family, ReactNode>>;
  /** The family it opens on, when offered. Otherwise the first one. */
  preferred?: Family;
}) {
  const families = (Object.keys(LABELS) as Family[]).filter((f) => !!prompts[f]);
  const [family, setFamily] = useState<Family | undefined>(defaultFamily(families, preferred));
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const id = useId();
  if (!family) return null;
  const text = prompts[family] ?? "";
  return (
    <div className="mt-4 rounded-lg border border-line bg-canvas p-3 text-left">
      <p className="text-xs font-medium text-muted">{title}</p>
      {families.length > 1 && (
        <fieldset className="mt-2 space-y-1">
          <legend className="sr-only">Which AI do you use?</legend>
          {families.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name={`${id}-family`}
                value={f}
                checked={family === f}
                onChange={() => {
                  setFamily(f);
                  setCopied(false);
                  setCopyFailed(false);
                }}
              />{" "}
              {LABELS[f]}
            </label>
          ))}
        </fieldset>
      )}
      {families.length === 1 && <p className="mt-1 text-sm font-medium text-ink">{LABELS[family]}</p>}
      <pre id={`${id}-text`} className="mt-2 max-h-64 overflow-auto text-sm whitespace-pre-wrap text-ink">
        {text}
      </pre>
      <button
        type="button"
        aria-describedby={`${id}-text`}
        className={buttonQuiet}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setCopyFailed(false);
          } catch {
            setCopied(false);
            setCopyFailed(true);
          }
        }}
      >
        Copy
      </button>
      <span aria-live="polite" className="ml-2 text-xs text-muted">
        {copied ? "Copied" : copyFailed ? "Couldn't copy. Select the text above and copy it." : ""}
      </span>
      {after[family] && <div className="mt-3">{after[family]}</div>}
    </div>
  );
}
