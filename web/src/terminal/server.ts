import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { checkUpgrade } from "./auth";
import { removeLaunchSettings } from "./guardrails";
import { parseClientMessage, type ServerMessage } from "./protocol";
import { TerminalSession, type Launcher } from "./session";

/**
 * The Claude panel's terminal server: 127.0.0.1 only, WebSocket only, and only for Founderive's own page (see
 * checkUpgrade). It holds one session; every connected page sees the same one.
 */
export async function startTerminalServer(opts: { token: string; appPort: number; terminalPort: number; launcher: Launcher }): Promise<{ port: number; close: () => Promise<void> }> {
  const session = new TerminalSession(opts.launcher);
  const wss = new WebSocketServer({ noServer: true });
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  let port = opts.terminalPort;

  const send = (ws: WebSocket, m: ServerMessage) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
  };
  // Computed once per event (never once per client) so a round of clients all see the exact same state.
  const state = async (): Promise<ServerMessage> => {
    const running = session.running;
    const home = running ? session.home : await opts.launcher.home().catch(() => null);
    return {
      type: "state",
      running,
      available: await opts.launcher.available(),
      platform: opts.launcher.platform,
      home: home ? { name: home.name, mode: home.mode } : null,
    };
  };
  const broadcastState = async () => {
    const s = await state();
    for (const client of wss.clients) send(client as WebSocket, s);
  };

  // Warm the availability cache once at server start, so the first connection doesn't pay for a cold check.
  void opts.launcher.available();

  // One server-level listener, not one per connected page: a single broadcast per exit, so N connected pages
  // cost O(N) state sends on exit, not O(N^2) (every page's own listener re-broadcasting to every page).
  session.onExit(() => {
    void broadcastState();
  });

  httpServer.on("upgrade", (req, socket, head) => {
    const verdict = checkUpgrade(req, { token: opts.token, appPort: opts.appPort, terminalPort: port });
    if (!verdict.ok) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
  });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("error", () => {});
    // Capture the scrollback snapshot and subscribe to live output in the same synchronous tick, with no
    // await between them: anything the pty prints is either in `snapshot` (produced before this instant) or
    // forwarded by the listener (produced after), never both — so a reconnecting page sees each byte once,
    // in order, however long the (async) availability check behind the "state" message below takes.
    const snapshot = session.scrollback;
    const offOutput = session.onOutput((data) => send(ws, { type: "output", data }));
    if (snapshot) send(ws, { type: "output", data: snapshot });
    // The replay can't rebuild a full-screen program whose screen started more than 200 KB ago, so a running
    // program is asked to repaint (the replay stays as the fallback for one that doesn't).
    if (session.running) session.redraw();
    const offExit = session.onExit((code) => {
      send(ws, { type: "exit", code });
    });
    void (async () => {
      send(ws, await state());
    })();
    // Messages on one connection are handled one at a time, in order: a "start" is async (it awaits the
    // cached availability and the spawn), and an "input" right behind it must wait for the pty to exist.
    let queue = Promise.resolve();
    ws.on("message", (raw) => {
      const m = parseClientMessage(String(raw));
      if (!m) return;
      queue = queue.then(async () => {
        try {
          if (m.type === "start") {
            await session.start(m.tool, m.cols, m.rows);
            await broadcastState();
          } else if (m.type === "input") session.write(m.data);
          else if (m.type === "resize") session.resize(m.cols, m.rows);
          else if (m.type === "end") session.end();
        } catch (error) {
          send(ws, { type: "error", message: (error as Error).message });
        }
      });
    });
    ws.on("close", () => {
      offOutput();
      offExit();
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(opts.terminalPort, "127.0.0.1", resolve));
  const address = httpServer.address();
  port = typeof address === "object" && address ? address.port : opts.terminalPort;

  return {
    port,
    close: async () => {
      await session.shutdown();
      await removeLaunchSettings();
      for (const client of wss.clients) client.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
