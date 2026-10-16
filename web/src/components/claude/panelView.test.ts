import { describe, expect, it } from "vitest";
import { panelView, type PanelInput } from "./panelView";

const ready: PanelInput = {
  terminal: true,
  platform: "supported",
  conn: "open",
  state: { running: null, available: { claude: true, codex: true }, platform: "supported", home: { name: "Lantern", mode: "record" } },
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
    expect(panelView(ready)).toEqual({ kind: "start", status: "Not started", stopped: false, tools: ["claude", "codex"], note: null });
    expect(panelView({ ...ready, state: { ...ready.state!, available: { claude: false, codex: true } } })).toMatchObject({ kind: "start", tools: ["codex"] });
  });

  it("after the program stops, says Stopped and offers to start again", () => {
    expect(panelView({ ...ready, exited: true })).toEqual({ kind: "start", status: "Stopped", stopped: true, tools: ["claude", "codex"], note: null });
  });

  it("when neither tool is installed, says how to install Claude Code", () => {
    expect(panelView({ ...ready, state: { ...ready.state!, available: { claude: false, codex: false } } })).toEqual({ kind: "not-installed", status: "Not started" });
  });

  it("while a program runs, names it", () => {
    expect(panelView({ ...ready, exited: true, state: { ...ready.state!, running: "codex" } })).toEqual({ kind: "running", status: "Running · codex · in Lantern", tool: "codex" });
  });

  it("names the folder the program runs in", () => {
    expect(panelView({ ...ready, state: { ...ready.state!, running: "codex" } })).toMatchObject({ kind: "running", status: "Running · codex · in Lantern" });
  });

  it("before setup, says Claude already works in the record", () => {
    const before = panelView({ ...ready, state: { ...ready.state!, home: { name: "founder-data", mode: "setup" } } });
    expect(before).toMatchObject({ kind: "start", note: "Finish setup in the app. Claude already works in your record." });
    expect(panelView(ready)).toMatchObject({ kind: "start", note: null });
  });

  it("when the data folder setting points inside the app, says what to do before starting", () => {
    const unsafe = panelView({ ...ready, state: { ...ready.state!, home: { name: "app", mode: "unsafe" } } });
    expect(unsafe).toMatchObject({ kind: "start", note: "Your data folder setting points inside the Founderive app. Move it, or use founder-data/, then start Claude." });
  });

  it("names the data folder while running before setup too", () => {
    expect(panelView({ ...ready, state: { ...ready.state!, running: "claude", home: { name: "founder-data", mode: "setup" } } })).toMatchObject({ status: "Running · claude · in founder-data" });
  });

  it("falls back to the plain status when the server didn't say where", () => {
    expect(panelView({ ...ready, state: { ...ready.state!, running: "claude", home: null } })).toMatchObject({ status: "Running · claude" });
  });
});
