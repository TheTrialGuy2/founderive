import { TOOLS, type ServerMessage, type Tool } from "@/terminal/protocol";

export type Conn = "connecting" | "open" | "refused" | "closed";

export type PanelInput = {
  /** Whether the page was given the terminal's port and token (start.mjs started it). */
  terminal: boolean;
  /** The app's own platform, known without connecting. */
  platform: "supported" | "windows";
  conn: Conn;
  state: Omit<Extract<ServerMessage, { type: "state" }>, "type"> | null;
  /** The program stopped since this page connected. */
  exited: boolean;
};

/** What the panel shows: which message or buttons, and the header's state in words. */
export type PanelView =
  | { kind: "no-server"; status: "Not started" }
  | { kind: "windows"; status: "Not available" }
  | { kind: "connecting"; status: "Connecting" }
  | { kind: "lost"; status: "Unavailable" }
  | { kind: "not-installed"; status: "Not started" }
  | { kind: "start"; status: "Not started" | "Stopped"; stopped: boolean; tools: Tool[]; note: string | null }
  | { kind: "running"; status: `Running · ${Tool}${string}`; tool: Tool };

const NOTE: Record<"record" | "setup" | "unsafe", string | null> = {
  record: null,
  setup: "Finish setup in the app. Claude already works in your record.",
  unsafe: "Your data folder setting points inside the Founderive app. Move it, or use founder-data/, then start Claude.",
};

export function panelView({ terminal, platform, conn, state, exited }: PanelInput): PanelView {
  if (platform === "windows" || state?.platform === "windows") return { kind: "windows", status: "Not available" };
  if (!terminal) return { kind: "no-server", status: "Not started" };
  if (conn === "refused" || conn === "closed") return { kind: "lost", status: "Unavailable" };
  if (conn === "connecting" || !state) return { kind: "connecting", status: "Connecting" };
  if (state.running) {
    const where = state.home ? ` · in ${state.home.name}` : "";
    return { kind: "running", status: `Running · ${state.running}${where}`, tool: state.running };
  }
  const tools = TOOLS.filter((t) => state.available[t]);
  if (tools.length === 0) return { kind: "not-installed", status: "Not started" };
  const note = state.home ? NOTE[state.home.mode] : null;
  return exited ? { kind: "start", status: "Stopped", stopped: true, tools, note } : { kind: "start", status: "Not started", stopped: false, tools, note };
}
