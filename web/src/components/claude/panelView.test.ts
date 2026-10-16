import { describe, expect, it } from "vitest";
import { panelView, type PanelInput } from "./panelView";

const ready: PanelInput = {
  terminal: true,
  platform: "supported",
  conn: "open",
  state: { running: null, available: { claude: true, codex: true }, platform: "supported", home: null },
  exited: false,
};

describe("panelView", () => {
  it("without the terminal server, says the panel starts with Founderive", () => {
    expect(panelView({ ...ready, terminal: false, conn: "connecting", state: null })).toEqual({ kind: "no-server", status: "Not started" });
  });

  it("on Windows, says it isn't available without waiting for a connection", () => {
    expect(panelView({ ...ready, terminal: false, platform: "windows", conn: "connecting", state: null })).toEqual({ kind: "windows", status: "Not available" });
  });

  it("when the server itself reports Windows, says the same", () => {
    expect(panelView({ ...ready, state: { ...ready.state!, platform: "windows" } })).toEqual({ kind: "windows", status: "Not available" });
  });

  it("while connecting, and while connected but the first state hasn't arrived, says Connecting", () => {
    expect(panelView({ ...ready, conn: "connecting", state: null })).toEqual({ kind: "connecting", status: "Connecting" });
    expect(panelView({ ...ready, state: null })).toEqual({ kind: "connecting", status: "Connecting" });
  });

  it("when the connection is refused or lost, says Unavailable", () => {
    expect(panelView({ ...ready, conn: "refused", state: null })).toEqual({ kind: "lost", status: "Unavailable" });
    expect(panelView({ ...ready, conn: "closed" })).toEqual({ kind: "lost", status: "Unavailable" });
  });

  it("with nothing running, offers to start what's installed, Claude first", () => {
    expect(panelView(ready)).toEqual({ kind: "start", status: "Not started", stopped: false, tools: ["claude", "codex"] });
    expect(panelView({ ...ready, state: { ...ready.state!, available: { claude: false, codex: true } } })).toMatchObject({ kind: "start", tools: ["codex"] });
  });

  it("after the program stops, says Stopped and offers to start again", () => {
    expect(panelView({ ...ready, exited: true })).toEqual({ kind: "start", status: "Stopped", stopped: true, tools: ["claude", "codex"] });
  });

  it("when neither tool is installed, says how to install Claude Code", () => {
    expect(panelView({ ...ready, state: { ...ready.state!, available: { claude: false, codex: false } } })).toEqual({ kind: "not-installed", status: "Not started" });
  });

  it("while a program runs, names it", () => {
    expect(panelView({ ...ready, exited: true, state: { ...ready.state!, running: "codex" } })).toEqual({ kind: "running", status: "Running · codex", tool: "codex" });
  });
});
