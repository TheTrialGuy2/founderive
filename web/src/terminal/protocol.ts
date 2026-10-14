// Messages between the Claude panel and the terminal server. Types only: safe to import from client code.
export type Tool = "claude" | "codex";
export const TOOLS: readonly Tool[] = ["claude", "codex"];

export type ClientMessage =
  | { type: "start"; tool: Tool; cols: number; rows: number }
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "end" };

export type ServerMessage =
  | { type: "state"; running: Tool | null; available: Record<Tool, boolean>; platform: "supported" | "windows" }
  | { type: "output"; data: string }
  | { type: "exit"; code: number | null }
  | { type: "error"; message: string };

const size = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 1000;

/** A message from the panel, or null for anything that isn't exactly one of the four. A program can only be claude or codex. */
export function parseClientMessage(raw: string): ClientMessage | null {
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object") return null;
  const o = m as Record<string, unknown>;
  if (o.type === "start" && (TOOLS as readonly unknown[]).includes(o.tool) && size(o.cols) && size(o.rows)) return { type: "start", tool: o.tool as Tool, cols: o.cols, rows: o.rows };
  if (o.type === "input" && typeof o.data === "string") return { type: "input", data: o.data };
  if (o.type === "resize" && size(o.cols) && size(o.rows)) return { type: "resize", cols: o.cols, rows: o.rows };
  if (o.type === "end") return { type: "end" };
  return null;
}
