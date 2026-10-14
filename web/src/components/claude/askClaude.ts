"use client";

export const ASK_CLAUDE_EVENT = "founderive:ask-claude";

/** Opens the Claude panel and types `text` into it, without pressing Enter. The founder sends it. */
export function askClaude(text: string): void {
  window.dispatchEvent(new CustomEvent(ASK_CLAUDE_EVENT, { detail: text }));
}
