import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import type { ServerMessage, Tool } from "./protocol";
import { startTerminalServer } from "./server";
import { commandExists, loginShellLauncher, TerminalSession, type Launcher } from "./session";

const TOKEN = "t".repeat(64);
const APP = 3999;

const HOME = { cwd: process.cwd(), mode: "repo" as const, name: "web" };

/** A Launcher whose one tool runs the given program, standing in for `claude`. codex is "not installed". */
function launcherFor(file: string, args: string[] = []): Launcher {
  return {
    command: async () => ({ file, args }),
    available: () => Promise.resolve({ claude: true, codex: false }) as Promise<Record<Tool, boolean>>,
    home: async () => HOME,
    platform: "supported",
  };
}

/** A Launcher whose `available()` only resolves after `ms`, simulating a cold availability cache. */
function slowLauncher(file: string, args: string[], ms: number, onCommand?: () => void): Launcher {
  return {
    command: async () => {
      onCommand?.();
      return { file, args };
    },
    available: () => new Promise((resolve) => setTimeout(() => resolve({ claude: true, codex: false } as Record<Tool, boolean>), ms)),
    home: async () => HOME,
    platform: "supported",
  };
}

// A stand-in for claude: cat echoes what it's sent. codex is "not installed".
const launcher = launcherFor("/bin/cat");

let server: Awaited<ReturnType<typeof startTerminalServer>> | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

async function start(l: Launcher = launcher) {
  server = await startTerminalServer({ token: TOKEN, appPort: APP, terminalPort: 0, launcher: l });
  return server.port;
}

function connect(port: number, opts: { token?: string; origin?: string; host?: string } = {}) {
  return new WebSocket(`ws://127.0.0.1:${port}/?token=${opts.token ?? TOKEN}`, {
    origin: opts.origin ?? `http://127.0.0.1:${APP}`,
    headers: opts.host ? { host: opts.host } : undefined,
  });
}

/** Resolves with the HTTP status of a refused upgrade, or "open". */
function outcome(ws: WebSocket): Promise<number | "open"> {
  return new Promise((resolve) => {
    ws.on("open", () => {
      resolve("open");
      ws.close();
    });
    ws.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0));
    ws.on("error", () => resolve(0));
  });
}

/** Collects messages until `until` returns true for the list so far. */
function until(ws: WebSocket, done: (msgs: ServerMessage[]) => boolean, ms = 4000): Promise<ServerMessage[]> {
  const msgs: ServerMessage[] = [];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out; got ${JSON.stringify(msgs)}`)), ms);
    ws.on("message", (raw) => {
      msgs.push(JSON.parse(String(raw)));
      if (done(msgs)) {
        clearTimeout(timer);
        resolve(msgs);
      }
    });
  });
}

const output = (msgs: ServerMessage[]) => msgs.flatMap((m) => (m.type === "output" ? [m.data] : [])).join("");
const start_ = (ws: WebSocket) => ws.send(JSON.stringify({ type: "start", tool: "claude", cols: 80, rows: 24 }));

describe("terminal server", () => {
  it("refuses a wrong token, another origin or another host with 403", async () => {
    const port = await start();
    expect(await outcome(connect(port, { token: "x".repeat(64) }))).toBe(403);
    expect(await outcome(connect(port, { origin: "https://evil.example" }))).toBe(403);
    expect(await outcome(connect(port, { host: `evil.example:${port}` }))).toBe(403);
    expect(await outcome(connect(port))).toBe("open");
  });

  it("serves nothing over plain HTTP", async () => {
    const port = await start();
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(404);
  });

  it("says which tools are available, starts one, and passes input and output", async () => {
    const port = await start();
    const ws = connect(port);
    const first = await until(ws, (m) => m.some((x) => x.type === "state"));
    expect(first.find((m) => m.type === "state")).toMatchObject({ running: null, available: { claude: true, codex: false } });
    const echoed = until(ws, (m) => output(m).includes("hello"));
    start_(ws);
    ws.send(JSON.stringify({ type: "input", data: "hello\r" }));
    expect(output(await echoed)).toContain("hello");
    ws.close();
  });

  it("reports the home in every state message", async () => {
    const port = await start(launcherFor("/bin/cat"));
    const ws = connect(port);
    const msgs = await until(ws, (m) => m.some((x) => x.type === "state"));
    const state = msgs.find((x) => x.type === "state") as Extract<ServerMessage, { type: "state" }>;
    expect(state.home).toEqual({ name: "web", mode: "repo" });
    ws.close();
  });

  it("spawns the program in the home's folder and passes the command the home produced", async () => {
    const seen: { cwd?: string; file?: string; args?: string[] } = {};
    const fakePty = {
      onData() {},
      onExit() {},
      write() {},
      kill() {},
      pid: 0,
      resize() {},
    };
    const home = { cwd: tmpdir(), mode: "record" as const, name: "Lantern" };
    const l: Launcher = {
      ...launcherFor("/bin/cat"),
      home: async () => home,
      command: async (_tool, h) => ({ file: "/bin/cat", args: ["--in", h.cwd] }),
      loadPty: async () =>
        ({
          spawn: (file: string, args: string[], opts: { cwd: string }) => {
            seen.cwd = opts.cwd;
            seen.file = file;
            seen.args = args;
            return fakePty;
          },
        }) as unknown as typeof import("node-pty"),
    };
    const port = await start(l);
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    const running = until(ws, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    start_(ws);
    const states = await running;
    expect(seen).toEqual({ cwd: tmpdir(), file: "/bin/cat", args: ["--in", tmpdir()] });
    const last = states.filter((x) => x.type === "state").pop() as Extract<ServerMessage, { type: "state" }>;
    expect(last.home).toEqual({ name: "Lantern", mode: "record" });
    ws.close();
  });

  it("refuses to start a tool that isn't installed", async () => {
    const port = await start();
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    const got = until(ws, (m) => m.some((x) => x.type === "error"));
    ws.send(JSON.stringify({ type: "start", tool: "codex", cols: 80, rows: 24 }));
    expect((await got).find((m) => m.type === "error")).toMatchObject({ message: expect.stringMatching(/codex/i) });
    ws.close();
  });

  it("refuses a second start while one is already running", async () => {
    const port = await start();
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    const runningBroadcast = until(ws, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    start_(ws);
    await runningBroadcast;
    const got = until(ws, (m) => m.some((x) => x.type === "error"));
    start_(ws);
    expect((await got).find((m) => m.type === "error")).toMatchObject({ message: expect.stringMatching(/already running/i) });
    ws.close();
  });

  it("keeps the session when the page reconnects, and replays what was on screen", async () => {
    const port = await start();
    const a = connect(port);
    await until(a, (m) => m.some((x) => x.type === "state"));
    const echoed = until(a, (m) => output(m).includes("remember me"));
    start_(a);
    a.send(JSON.stringify({ type: "input", data: "remember me\r" }));
    await echoed;
    a.close();
    const b = connect(port);
    const replay = await until(b, (m) => m.some((x) => x.type === "state") && output(m).includes("remember me"));
    expect(replay.find((m) => m.type === "state")).toMatchObject({ running: "claude" });
    b.close();
  });

  it("ends the session on request", async () => {
    const port = await start();
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    start_(ws);
    const ended = until(ws, (m) => m.some((x) => x.type === "exit"));
    ws.send(JSON.stringify({ type: "end" }));
    expect((await ended).some((m) => m.type === "exit")).toBe(true);
    const again = connect(port);
    const state = await until(again, (m) => m.some((x) => x.type === "state"));
    expect(state.find((m) => m.type === "state")).toMatchObject({ running: null });
    again.close();
    ws.close();
  });

  it("ends a program that ignores SIGHUP within a few seconds", async () => {
    const port = await start(launcherFor("/bin/sh", ["-c", 'trap "" HUP; cat']));
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    start_(ws);
    await until(ws, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    const ended = until(ws, (m) => m.some((x) => x.type === "exit"), 4500);
    ws.send(JSON.stringify({ type: "end" }));
    expect((await ended).some((m) => m.type === "exit")).toBe(true);
    ws.close();
  }, 6000);

  it("ignores messages that aren't one of the four", async () => {
    const port = await start();
    const tmpfile = join(tmpdir(), `founderive-terminal-test-${process.pid}-${Date.now()}`);
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    ws.send(JSON.stringify({ type: "run", cmd: `touch ${tmpfile}` }));
    ws.send("not json");
    const state = until(ws, (m) => m.some((x) => x.type === "state"));
    start_(ws);
    expect((await state).length).toBeGreaterThan(0);
    expect(existsSync(tmpfile)).toBe(false);
    ws.close();
  });

  it("gives two connected pages both the output and the start broadcast", async () => {
    const port = await start();
    const a = connect(port);
    const b = connect(port);
    await Promise.all([until(a, (m) => m.some((x) => x.type === "state")), until(b, (m) => m.some((x) => x.type === "state"))]);
    const aRunning = until(a, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    const bRunning = until(b, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    const aEcho = until(a, (m) => output(m).includes("both see this"));
    const bEcho = until(b, (m) => output(m).includes("both see this"));
    start_(a);
    a.send(JSON.stringify({ type: "input", data: "both see this\r" }));
    await Promise.all([aRunning, bRunning]);
    expect(output(await aEcho)).toContain("both see this");
    expect(output(await bEcho)).toContain("both see this");
    a.close();
    b.close();
  });

  it("doesn't pass the terminal token into the running program's environment", async () => {
    const prior = process.env.FOUNDERIVE_TERMINAL_TOKEN;
    process.env.FOUNDERIVE_TERMINAL_TOKEN = "super-secret-token-value";
    try {
      const port = await start(launcherFor("/bin/sh", ["-c", "echo T=$FOUNDERIVE_TERMINAL_TOKEN; cat"]));
      const ws = connect(port);
      await until(ws, (m) => m.some((x) => x.type === "state"));
      const echoed = until(ws, (m) => output(m).includes("T="));
      start_(ws);
      const text = output(await echoed);
      expect(text).toMatch(/T=\r?\n/);
      expect(text).not.toContain("super-secret-token-value");
      ws.close();
    } finally {
      if (prior === undefined) delete process.env.FOUNDERIVE_TERMINAL_TOKEN;
      else process.env.FOUNDERIVE_TERMINAL_TOKEN = prior;
    }
  });

  it("lets only one of two racing starts actually spawn, and End afterwards leaves nothing running", async () => {
    let spawnCount = 0;
    const port = await start(slowLauncher("/bin/cat", [], 150, () => spawnCount++));
    const a = connect(port);
    const b = connect(port);
    await Promise.all([until(a, (m) => m.some((x) => x.type === "state")), until(b, (m) => m.some((x) => x.type === "state"))]);
    const aError = until(a, (m) => m.some((x) => x.type === "error"), 2000).catch(() => null);
    const bError = until(b, (m) => m.some((x) => x.type === "error"), 2000).catch(() => null);
    start_(a);
    start_(b);
    const [aErr, bErr] = await Promise.all([aError, bError]);
    const errors = [aErr, bErr].filter((x): x is ServerMessage[] => x !== null);
    expect(errors).toHaveLength(1);
    expect(errors[0].find((m) => m.type === "error")).toMatchObject({ message: expect.stringMatching(/already running/i) });
    expect(spawnCount).toBe(1);

    const ended = until(a, (m) => m.some((x) => x.type === "exit"), 3000).catch(() => until(b, (m) => m.some((x) => x.type === "exit"), 3000));
    a.send(JSON.stringify({ type: "end" }));
    b.send(JSON.stringify({ type: "end" }));
    await ended;
    const c = connect(port);
    const state = await until(c, (m) => m.some((x) => x.type === "state"));
    expect(state.find((m) => m.type === "state")).toMatchObject({ running: null });
    a.close();
    b.close();
    c.close();
  });

  it("cancels a pending start if end() is called before availability resolves, without spawning", async () => {
    let spawnCount = 0;
    const session = new TerminalSession(slowLauncher("/bin/cat", [], 150, () => spawnCount++));
    const startPromise = session.start("claude", 80, 24);
    session.end();
    await startPromise;
    expect(session.running).toBeNull();
    expect(spawnCount).toBe(0);
  });

  it("replays scrollback exactly once on reconnect, even while availability is slow to resolve", async () => {
    // Availability takes 150ms on every call (simulating a cold cache). The stand-in program itself (not an
    // echo of typed input, which a pty would double-print via its own local echo) prints "late-marker" once,
    // 50ms after it starts — timed to land while the *second* connection's own "state" message (which also
    // waits 150ms on its own availability check) is still pending, i.e. right in the window this fix covers.
    const port = await start(slowLauncher("/bin/sh", ["-c", "sleep 0.05; echo late-marker; sleep 5"], 150));
    const a = connect(port);
    await until(a, (m) => m.some((x) => x.type === "state"));
    start_(a);
    await until(a, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    // Give the marker time to actually print and land in the session's scrollback before b connects, so this
    // exercises the snapshot path (not the live-forward path): b's own "state" message won't arrive for 150ms
    // more, a window during which the old code re-read (and resent) the scrollback a second time.
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Attach the listener immediately (as `connect` returns), not after an `open` wait: the server can send
    // the snapshot synchronously, essentially as soon as the socket is accepted, and a listener attached only
    // after awaiting `open` can miss an event already emitted on this EventEmitter.
    const b = connect(port);
    const bMsgs = await until(b, (m) => m.some((x) => x.type === "state") && output(m).includes("late-marker"), 4000);
    const text = output(bMsgs);
    expect(text.match(/late-marker/g)?.length ?? 0).toBe(1);
    a.close();
    b.close();
  });

  it("broadcasts state once on exit, not once per connected page", async () => {
    const port = await start();
    const sockets = [connect(port), connect(port), connect(port)];
    await Promise.all(sockets.map((ws) => until(ws, (m) => m.some((x) => x.type === "state"))));
    const collected: ServerMessage[][] = sockets.map(() => []);
    sockets.forEach((ws, i) => ws.on("message", (raw) => collected[i].push(JSON.parse(String(raw)))));

    start_(sockets[0]);
    // Wait for every connected page's own copy of the start broadcast to actually arrive client-side before
    // taking the baseline — broadcastState() sends to all three in the same tick, but delivery to each
    // socket's "message" event is independently async, so socket 0 seeing its own copy doesn't mean the
    // other two have theirs yet.
    await Promise.all(sockets.map((ws) => until(ws, (m) => m.some((x) => x.type === "state" && x.running === "claude"))));
    const beforeExit = collected.map((msgs) => msgs.filter((m) => m.type === "state").length);

    const exited = until(sockets[0], (m) => m.some((x) => x.type === "exit"));
    sockets[0].send(JSON.stringify({ type: "end" }));
    await exited;
    await new Promise((resolve) => setTimeout(resolve, 50));

    const afterExit = collected.map((msgs) => msgs.filter((m) => m.type === "state").length);
    const delta = afterExit.map((c, i) => c - beforeExit[i]);
    for (const d of delta) expect(d).toBe(1);
    sockets.forEach((ws) => ws.close());
  });

  it("commandExists classifies a real command as available and a made-up one as not, with an injectable shell", async () => {
    await expect(commandExists("sh", "/bin/sh")).resolves.toBe(true);
    await expect(commandExists("definitely-not-a-real-command-xyz123", "/bin/sh")).resolves.toBe(false);
    await expect(commandExists("sh; touch /tmp/x", "/bin/sh")).resolves.toBe(false);
  });

  it("loginShellLauncher reuses the cached availability within 30s, and refreshes after", async () => {
    const counterFile = join(tmpdir(), `founderive-loginshell-counter-${process.pid}-${Date.now()}`);
    const scriptPath = join(tmpdir(), `founderive-loginshell-fakeshell-${process.pid}-${Date.now()}.sh`);
    writeFileSync(scriptPath, `#!/bin/sh\necho x >> "$FOUNDERIVE_TEST_COUNTER"\nexit 0\n`, { mode: 0o755 });
    const priorCounter = process.env.FOUNDERIVE_TEST_COUNTER;
    process.env.FOUNDERIVE_TEST_COUNTER = counterFile;
    const count = () => (existsSync(counterFile) ? readFileSync(counterFile, "utf8").split("\n").filter(Boolean).length : 0);
    try {
      let now = 1_000_000;
      const launcher = loginShellLauncher(process.cwd(), { shell: scriptPath, now: () => now });
      await launcher.available();
      const afterFirst = count();
      expect(afterFirst).toBeGreaterThan(0);

      now += 29_000; // still within the 30s cache window
      await launcher.available();
      expect(count()).toBe(afterFirst);

      now += 2_000; // now 31s after the first check: cache expired
      await launcher.available();
      expect(count()).toBeGreaterThan(afterFirst);
    } finally {
      if (priorCounter === undefined) delete process.env.FOUNDERIVE_TEST_COUNTER;
      else process.env.FOUNDERIVE_TEST_COUNTER = priorCounter;
      rmSync(counterFile, { force: true });
      rmSync(scriptPath, { force: true });
    }
  });
  it("End also stops what the program started, even a child that ignores SIGHUP and SIGTERM", async () => {
    const port = await start(launcherFor("/bin/sh", ["-c", '(trap "" HUP TERM; sleep 60) & echo child=$!; cat']));
    const ws = connect(port);
    let childPid = 0;
    try {
      await until(ws, (m) => m.some((x) => x.type === "state"));
      const printed = until(ws, (m) => /child=\d+/.test(output(m)));
      start_(ws);
      childPid = Number(/child=(\d+)/.exec(output(await printed))![1]);
      expect(alive(childPid)).toBe(true);
      ws.send(JSON.stringify({ type: "end" }));
      const deadline = Date.now() + 4000;
      while (alive(childPid) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 100));
      expect(alive(childPid)).toBe(false);
    } finally {
      if (childPid && alive(childPid)) process.kill(childPid, "SIGKILL");
      ws.close();
    }
  }, 8000);

  it("doesn't pass the launching agent's session into the program, and marks it as Founderive's panel", async () => {
    const keys = ["CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT", "CLAUDE_CODE_SSE_PORT", "CLAUDE_PID", "CODEX_SANDBOX", "CODEX_HOME_TEST", "FOUNDERIVE_PANEL"];
    const prior = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys.slice(0, -1)) process.env[k] = `leak-${k}`;
    delete process.env.FOUNDERIVE_PANEL;
    try {
      const port = await start(launcherFor("/bin/sh", ["-c", "env; echo END-OF-ENV; cat"]));
      const ws = connect(port);
      await until(ws, (m) => m.some((x) => x.type === "state"));
      const printed = until(ws, (m) => output(m).includes("END-OF-ENV"));
      start_(ws);
      const text = output(await printed);
      expect(text).not.toContain("leak-");
      expect(text).toMatch(/^FOUNDERIVE_PANEL=1\r?$/m);
      ws.close();
    } finally {
      for (const k of keys) {
        if (prior[k] === undefined) delete process.env[k];
        else process.env[k] = prior[k];
      }
    }
  });

  it("says what to do when the terminal library isn't installed, and still reports what's available", async () => {
    const missing: Launcher = { ...launcherFor("/bin/cat"), loadPty: () => Promise.reject(Object.assign(new Error("Cannot find package 'node-pty'"), { code: "ERR_MODULE_NOT_FOUND" })) };
    const port = await start(missing);
    const ws = connect(port);
    const first = await until(ws, (m) => m.some((x) => x.type === "state"));
    expect(first.find((m) => m.type === "state")).toMatchObject({ available: { claude: true, codex: false } });
    const got = until(ws, (m) => m.some((x) => x.type === "error"));
    start_(ws);
    expect((await got).find((m) => m.type === "error")).toMatchObject({
      message: "The terminal library isn't installed on this computer. Run pnpm pty-check in web/ for details.",
    });
    ws.close();
  });

  it("asks a running program to redraw when a page reconnects, and echo still works after", async () => {
    const port = await start();
    const a = connect(port);
    await until(a, (m) => m.some((x) => x.type === "state"));
    start_(a);
    await until(a, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    a.close();
    const resize = vi.spyOn(TerminalSession.prototype, "resize");
    try {
      const b = connect(port);
      await until(b, (m) => m.some((x) => x.type === "state"));
      await new Promise((r) => setTimeout(r, 150));
      expect(resize.mock.calls).toEqual([
        [80, 23],
        [80, 24],
      ]);
      const echoed = until(b, (m) => output(m).includes("still here"));
      b.send(JSON.stringify({ type: "input", data: "still here\r" }));
      expect(output(await echoed)).toContain("still here");
      b.close();
    } finally {
      resize.mockRestore();
    }
  });

  it("ignores a resize that races the program's exit instead of showing the founder a raw error", async () => {
    const fakePty = {
      onData: () => ({ dispose() {} }),
      onExit: () => ({ dispose() {} }),
      write() {},
      kill() {},
      pid: 0,
      resize() {
        throw new Error("ioctl(2) failed, EBADF");
      },
    };
    const l: Launcher = { ...launcherFor("/bin/cat"), loadPty: async () => ({ spawn: () => fakePty }) as unknown as typeof import("node-pty") };
    const port = await start(l);
    const ws = connect(port);
    await until(ws, (m) => m.some((x) => x.type === "state"));
    const running = until(ws, (m) => m.some((x) => x.type === "state" && x.running === "claude"));
    start_(ws);
    await running;
    const errors = until(ws, (m) => m.some((x) => x.type === "error"), 300).catch(() => null);
    ws.send(JSON.stringify({ type: "resize", cols: 100, rows: 30 }));
    expect(await errors).toBeNull();
    ws.close();
  });
});

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
