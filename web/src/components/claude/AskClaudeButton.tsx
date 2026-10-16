"use client";

import { askClaude } from "@/components/claude/askClaude";
import { buttonQuiet } from "@/components/workbook/form";

/** Types `line` into the Claude panel without pressing Enter; the founder sends it. */
export function AskClaudeButton({ line, label }: { line: string; label: string }) {
  return (
    <button type="button" className={buttonQuiet} onClick={() => askClaude(line)}>
      {label}
    </button>
  );
}
