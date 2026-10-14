"use client";

import { askClaude } from "@/components/claude/askClaude";
import { buttonQuiet } from "@/components/workbook/form";

/** Types a starter line about this step into the Claude panel. It doesn't press Enter; the founder sends it. */
export function AskClaude({ title }: { title: string }) {
  return (
    <button type="button" className={buttonQuiet} onClick={() => askClaude(`I'm on the ${title} step in Founderive. Help me with it.`)}>
      Ask Claude about this step
    </button>
  );
}
