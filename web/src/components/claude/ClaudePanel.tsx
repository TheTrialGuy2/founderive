"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ServerMessage, Tool } from "@/terminal/protocol";
import { buttonPrimary, buttonQuiet } from "@/components/workbook/form";
import "@xterm/xterm/css/xterm.css";
import { ASK_CLAUDE_EVENT } from "./askClaude";
import { appendCapped } from "./pendingOutput";
import { panelView, type Conn } from "./panelView";
import { routeTerminalKey } from "./terminalKeys";

type Props = {
  terminal: { port: number; token: string } | null;
  /** "windows": the panel isn't available here, so it says so without connecting. */
  platform?: "supported" | "windows";
};

const OPEN_KEY = "founderive.claudePanel.open";
const WIDTH_KEY = "founderive.claudePanel.width";
const MIN_W = 320;
const MAX_W = 900;
const clampWidth = (w: number) => Math.max(MIN_W, Math.min(MAX_W, w));
const readStore = (k: string) => {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const writeStore = (k: string, v: string) => {
  try {
    window.localStorage.setItem(k, v);
  } catch {
    /* private window: the panel still works, it just won't remember */
  }
};

export function ClaudePanel({ terminal, platform = "supported" }: Props) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(440);
  const [conn, setConn] = useState<Conn>("connecting");
  const [state, setState] = useState<Extract<ServerMessage, { type: "state" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exited, setExited] = useState(false);
  // On wide screens the open panel takes room from the page instead of covering it (see globals.css).
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--claude-panel-space", open ? `${width}px` : "0px");
    return () => {
      root.style.removeProperty("--claude-panel-space");
    };
  }, [open, width]);
  // A question from "Ask Claude about this step" while nothing was running. It's never typed into a program
  // started afterwards on its own; the founder types it in with a button once one runs.
  const [askDraft, setAskDraft] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const termRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const openRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const startRef = useRef<HTMLButtonElement | null>(null);
  // Whether a program is running, for the terminal's key handler (which is set up once).
  const runningRef = useRef(false);
  // The founder opened the panel in this page load (not just remembered open from last time),
  // so moving focus into it is expected.
  const userOpened = useRef(false);
  // The founder pressed Start in this page load; focus goes to the terminal once the program runs.
  const startedHere = useRef(false);
  // Where focus goes back to when the panel closes: whatever opened it (the opener, or an "Ask Claude" button).
  const returnFocus = useRef<HTMLElement | null>(null);
  const focusOnClose = useRef(false);
  // Output that arrives before the xterm instance exists (the server replays scrollback right after
  // connecting, before the first "state" message, and the terminal view itself loads asynchronously).
  // Buffered here (capped like the server's scrollback) and flushed once the terminal is created.
  const pendingOutput = useRef<string>("");

  // The terminal's port and token, as plain values: the server component hands a new `terminal` object on
  // every router.refresh() (LiveRefresh runs one on each founder-data change), and that must not reconnect.
  const port = terminal?.port;
  const token = terminal?.token;

  useEffect(() => {
    // Reads localStorage once, after mount, so the server-rendered default (closed, 440px) matches the
    // client's first render and there's no hydration mismatch; this one-time sync-from-storage is the
    // documented exception to the "no setState in an effect" rule, not an accident. Writes happen only
    // from the founder's own actions (open, close, resize), so this read can't be overwritten first.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-only read of localStorage, see above
    setOpen(readStore(OPEN_KEY) === "1");
    const w = Number(readStore(WIDTH_KEY));
    if (w >= MIN_W && w <= MAX_W) setWidth(w);
  }, []);

  const send = useCallback((m: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(m));
  }, []);

  /**
   * Fits the terminal to the panel and tells the program its size. Does nothing while the panel is closed.
   * This is the one place a resize is sent after the terminal is created.
   */
  const refit = useCallback(() => {
    const fit = fitRef.current;
    const term = termRef.current;
    if (!openRef.current || !fit || !term) return;
    fit.fit();
    send({ type: "resize", cols: term.cols, rows: term.rows });
  }, [send]);

  /**
   * Moves focus into the panel: the terminal only when a program is running and the founder opened or
   * started it in this page load; otherwise the first Start button, else Close.
   */
  const focusInside = useCallback(() => {
    const term = termRef.current;
    if (term && runningRef.current && (userOpened.current || startedHere.current)) term.focus();
    else (startRef.current ?? closeRef.current)?.focus();
  }, []);

  const openPanel = useCallback((from: Element | null) => {
    userOpened.current = true;
    if (!openRef.current) returnFocus.current = from instanceof HTMLElement ? from : null;
    setOpen(true);
    writeStore(OPEN_KEY, "1");
  }, []);

  const closePanel = () => {
    focusOnClose.current = true;
    setOpen(false);
    writeStore(OPEN_KEY, "0");
  };

  // One connection for the life of the page; the session itself lives in the terminal server.
  useEffect(() => {
    if (!port || !token) return;
    // A new connection (dev StrictMode remount, or a new launch's token) starts from scratch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the view for the connection this effect opens
    setConn("connecting");
    setState(null);
    setExited(false);
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${token}`);
    wsRef.current = ws;
    const current = () => wsRef.current === ws;
    let opened = false;
    ws.onopen = () => {
      if (!current()) return;
      opened = true;
      // Every connection replays the whole scrollback, so start from a clean screen.
      termRef.current?.reset();
      pendingOutput.current = "";
      setConn("open");
    };
    ws.onclose = () => {
      if (current()) setConn(opened ? "closed" : "refused");
    };
    ws.onmessage = (e) => {
      if (!current()) return;
      const m = JSON.parse(String(e.data)) as ServerMessage;
      if (m.type === "state") {
        setState(m);
        if (m.running) setExited(false);
      } else if (m.type === "output") {
        if (termRef.current) termRef.current.write(m.data);
        else pendingOutput.current = appendCapped(pendingOutput.current, m.data);
      } else if (m.type === "exit") setExited(true);
      else if (m.type === "error") {
        // A start that failed won't run, so focus mustn't jump into the terminal later for it.
        startedHere.current = false;
        setError(m.message);
      }
    };
    return () => {
      ws.onopen = null;
      ws.onclose = null;
      ws.onmessage = null;
      if (wsRef.current === ws) wsRef.current = null;
      ws.close();
    };
  }, [port, token, send]);

  const view = panelView({ terminal: !!terminal, platform, conn, state, exited });
  const supported = view.kind === "start" || view.kind === "running" || view.kind === "not-installed";

  // The terminal view, created once the panel is open and connected. It lives as long as the page:
  // closing the panel only hides it.
  useEffect(() => {
    if (!open || conn !== "open" || !supported || termRef.current || !hostRef.current) return;
    let disposed = false;
    (async () => {
      // The JS loads only in the browser (xterm touches window); its stylesheet is imported at the top of this file.
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      if (disposed || !hostRef.current || termRef.current) return;
      const css = getComputedStyle(document.documentElement);
      const term = new Terminal({
        fontFamily: css.getPropertyValue("--font-mono").trim() || "ui-monospace, Menlo, monospace",
        fontSize: 13,
        cursorBlink: true,
        theme: { background: "#0f2233", foreground: "#e8eef2", cursor: "#9ad1d4" },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(hostRef.current);
      fit.fit();
      // Flush anything that arrived (scrollback, or live output) while this view was still loading.
      if (pendingOutput.current) {
        term.write(pendingOutput.current);
        pendingOutput.current = "";
      }
      // While a program runs every key, Escape included, goes to it, except F6, which moves focus out to
      // Close. With nothing running, Tab and Escape leave the terminal (returning false lets the browser
      // and the panel's own Escape handler have them).
      term.attachCustomKeyEventHandler((e) => {
        const route = routeTerminalKey(e.key, runningRef.current);
        if (route === "program") return true;
        if (route === "close-button" && e.type === "keydown") {
          e.preventDefault();
          closeRef.current?.focus();
        }
        return false;
      });
      term.onData((data) => send({ type: "input", data }));
      send({ type: "resize", cols: term.cols, rows: term.rows });
      termRef.current = term;
      fitRef.current = fit;
      if (runningRef.current && (userOpened.current || startedHere.current)) term.focus();
    })();
    return () => {
      disposed = true;
    };
  }, [open, conn, supported, send]);

  // The xterm instance goes away with the page.
  useEffect(
    () => () => {
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
    },
    [],
  );

  useEffect(() => {
    openRef.current = open;
    if (open) {
      const id = requestAnimationFrame(() => {
        refit();
        // Remembered open on page load: leave focus where the page put it.
        if (userOpened.current) focusInside();
      });
      return () => cancelAnimationFrame(id);
    }
    if (focusOnClose.current) {
      focusOnClose.current = false;
      const back = returnFocus.current;
      (back?.isConnected ? back : openerRef.current)?.focus();
    }
  }, [open, refit, focusInside]);

  useEffect(() => {
    const id = requestAnimationFrame(refit);
    return () => cancelAnimationFrame(id);
  }, [width, refit]);

  useEffect(() => {
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, [refit]);

  // "Ask Claude about this step": open, then type the line without Enter into a program that's already
  // running. With nothing running, the line waits above the terminal as a draft for the founder to type in.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      openPanel(document.activeElement);
      if (state?.running) {
        send({ type: "input", data: text });
        setAskDraft(null);
      } else setAskDraft(text);
    };
    window.addEventListener(ASK_CLAUDE_EVENT, onAsk);
    return () => window.removeEventListener(ASK_CLAUDE_EVENT, onAsk);
  }, [state?.running, send, openPanel]);

  const typeDraft = () => {
    if (!askDraft || view.kind !== "running") return;
    send({ type: "input", data: askDraft });
    setAskDraft(null);
    termRef.current?.focus();
  };

  const start = (tool: Tool) => {
    setError(null);
    startedHere.current = true;
    termRef.current?.reset();
    const t = termRef.current;
    send({ type: "start", tool, cols: t?.cols ?? 80, rows: t?.rows ?? 24 });
  };

  const resizeTo = (w: number) => {
    const next = clampWidth(w);
    setWidth(next);
    writeStore(WIDTH_KEY, String(next));
  };

  const running = state?.running ?? null;

  useEffect(() => {
    runningRef.current = !!running;
    if (!running || !startedHere.current) return;
    // Started from this page: the Start button is gone, so focus goes to the program, at the panel's real size.
    startedHere.current = false;
    userOpened.current = true;
    const id = requestAnimationFrame(() => {
      refit();
      termRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [running, refit]);
  const showTerminal = supported;

  return (
    <>
      {!open && (
        <button
          ref={openerRef}
          type="button"
          onClick={(e) => openPanel(e.currentTarget)}
          className="fixed right-4 bottom-4 z-40 rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-navy shadow-sm hover:bg-aqua/45"
        >
          Open Claude
        </button>
      )}
      <aside
        aria-label="Claude"
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-40 h-[60vh] flex-col border-t border-line bg-paper shadow-2xl min-[900px]:inset-y-0 min-[900px]:right-0 min-[900px]:left-auto min-[900px]:h-auto min-[900px]:border-t-0 min-[900px]:border-l`}
        style={{ ["--panel-w" as string]: `${width}px` }}
        onKeyDown={(e) => {
          // Escape closes the panel from its header and buttons, and from the terminal when nothing runs;
          // while a program runs, Escape inside the terminal belongs to it.
          if (e.key !== "Escape" || (runningRef.current && hostRef.current?.contains(e.target as Node))) return;
          e.preventDefault();
          closePanel();
        }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the Claude panel"
          aria-valuenow={width}
          aria-valuemin={MIN_W}
          aria-valuemax={MAX_W}
          tabIndex={0}
          onKeyDown={(e) => {
            const next = e.key === "ArrowLeft" ? width + 24 : e.key === "ArrowRight" ? width - 24 : e.key === "Home" ? MIN_W : e.key === "End" ? MAX_W : null;
            if (next === null) return;
            e.preventDefault();
            resizeTo(next);
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            const el = e.currentTarget;
            el.setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const startW = width;
            let last = startW;
            const move = (ev: PointerEvent) => {
              last = clampWidth(startW + (startX - ev.clientX));
              setWidth(last);
            };
            const up = () => {
              el.removeEventListener("pointermove", move);
              el.removeEventListener("pointerup", up);
              el.removeEventListener("pointercancel", up);
              writeStore(WIDTH_KEY, String(last));
            };
            el.addEventListener("pointermove", move);
            el.addEventListener("pointerup", up);
            el.addEventListener("pointercancel", up);
          }}
          className="absolute inset-y-0 left-0 hidden w-1.5 cursor-col-resize hover:bg-aqua focus-visible:bg-aqua min-[900px]:block"
        />
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
          <p className="text-sm font-semibold text-navy">
            Claude{" "}
            <span role="status" className="ml-2 text-xs font-normal text-muted">
              {view.status}
            </span>
          </p>
          <div className="flex gap-1">
            {view.kind === "running" && (
              <button type="button" className={buttonQuiet} onClick={() => send({ type: "end" })}>
                End session
              </button>
            )}
            <button ref={closeRef} type="button" className={buttonQuiet} onClick={closePanel} aria-label="Close the Claude panel">
              Close
            </button>
          </div>
        </header>
        {view.kind === "windows" ? (
          <p className="p-4 text-sm text-ink">The Claude panel isn&apos;t available on Windows yet. Use Claude Code or Codex in your own terminal; everything else in Founderive works.</p>
        ) : view.kind === "no-server" ? (
          <p className="p-4 text-sm text-ink">The Claude panel starts with Founderive. Stop it, then run node start.mjs from the Founderive folder.</p>
        ) : view.kind === "lost" ? (
          <p className="p-4 text-sm text-ink">
            The panel lost its connection to the terminal. Only the panel is affected. Reload the page; if it keeps happening, restart Founderive with node start.mjs (in web/, pnpm pty-check shows what&apos;s wrong).
          </p>
        ) : view.kind === "start" ? (
          <div className="space-y-2 border-b border-line p-4 text-sm">
            {view.stopped && <p className="text-ink">Stopped. Start again?</p>}
            <div className="flex flex-wrap gap-2">
              {view.tools.map((tool, i) => (
                <button key={tool} ref={i === 0 ? startRef : undefined} type="button" className={i === 0 ? buttonPrimary : buttonQuiet} onClick={() => start(tool)}>
                  {tool === "claude" ? "Start Claude" : "Start Codex"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">{view.note ?? "It runs in your Founderive folder with your own sign-in, like any terminal."}</p>
          </div>
        ) : view.kind === "not-installed" ? (
          <div className="space-y-2 border-b border-line p-4 text-sm">
            <p className="text-ink">
              Claude Code isn&apos;t installed on this computer.{" "}
              <a href="https://docs.claude.com/en/docs/claude-code/setup" target="_blank" rel="noreferrer" className="font-medium text-teal-dark underline">
                Install Claude Code
              </a>
              , then reload this page.
            </p>
          </div>
        ) : null}
        {error && view.kind !== "windows" && view.kind !== "no-server" && view.kind !== "lost" && (
          <p role="alert" className="border-b border-line p-3 text-sm text-[#8a2d1c]">
            {error}
          </p>
        )}
        {askDraft && (
          <div className="space-y-2 border-b border-line p-4 text-sm">
            <p className="text-ink">
              <span className="font-medium">Your question:</span> {askDraft}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={buttonQuiet} disabled={view.kind !== "running"} onClick={typeDraft}>
                Type it into Claude
              </button>
              <button type="button" className={buttonQuiet} onClick={() => setAskDraft(null)}>
                Dismiss
              </button>
            </div>
            {view.kind === "start" ? (
              <p className="text-xs text-muted">Start Claude first, then type it in. Nothing is sent until you press Enter.</p>
            ) : view.kind !== "running" && view.kind !== "connecting" ? (
              <p className="text-xs text-muted">Or copy it into Claude Code in your own terminal.</p>
            ) : null}
          </div>
        )}
        {/* Always mounted while there's a terminal, so the xterm view survives the panel closing and any message above. */}
        {terminal && <div ref={hostRef} className={`${showTerminal ? "" : "hidden"} min-h-0 flex-1 bg-[#0f2233] p-2`} />}
        {showTerminal && running && <p className="border-t border-line px-4 py-1.5 text-xs text-muted">Press F6 to leave the terminal.</p>}
      </aside>
    </>
  );
}
