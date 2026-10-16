"use client";

import { askClaude } from "@/components/claude/askClaude";
import { buttonQuiet } from "@/components/workbook/form";
import { SYNTHESIZE_LINE, synthesizeLabel } from "@/core/synthesis";

/**
 * Types the synthesis line into the Claude panel; the founder presses Enter. Shows only from three qualifying
 * conversations (core/synthesis decides), and never becomes Home's main action.
 */
export function SynthesizeButton({ count }: { count: number }) {
  const label = synthesizeLabel(count);
  if (!label) return null;
  return (
    <p className="mb-4 text-sm text-muted">
      <button type="button" className={buttonQuiet} onClick={() => askClaude(SYNTHESIZE_LINE)}>
        {label}
      </button>{" "}
      Claude reads them and drafts themes for you to confirm.
    </p>
  );
}
