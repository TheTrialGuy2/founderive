import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { IPty } from "node-pty";
import { writeAgentHome } from "../store/agent-home";
import { initData } from "../store/init";
import { dataDir, dataFolderIsSafe, realPathOf } from "../store/paths";
import { readEntry } from "../store/read";
import { claudeArgs, panelHome, shellQuote, unsafeDataFolderMessage, writeLaunchSettings, type Home } from "./guardrails";
import { TOOLS, type Tool } from "./protocol";

const SCROLLBACK_BYTES = 200_000;
const AVAILABILITY_CACHE_MS = 30_000;
const AVAILABILITY_TIMEOUT_MS = 5_000;
const END_GRACE_MS = 2_500;
const REDRAW_DELAY_MS = 50;

type PtyModule = typeof import("node-pty");

export const PTY_MISSING = "The terminal library isn't installed on this computer. Run pnpm pty-check in web/ for details.";

/**
 * node-pty is loaded only when a program is started. It's an optional dependency (it has to be built on some
 * computers), so a computer without it still runs the terminal server, which then says what to do.
 */
const importNodePty = (): Promise<PtyModule> => import("node-pty");

/** The launching agent's own session (Claude Code, Codex) must not leak into the founder's program. */
const isAgentSessionKey = (k: string) => k === "CLAUDECODE" || k === "CLAUDE_PID" || k.startsWith("CLAUDE_CODE_") || k.startsWith("CODEX_");

/** The environment the founder's program runs with: theirs, minus the panel's secrets and any agent session, plus a marker. */
export function programEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined || isAgentSessionKey(k)) continue;
    if (k === "FOUNDERIVE_TERMINAL_TOKEN" || k === "FOUNDERIVE_TERMINAL_PORT" || k === "FOUNDERIVE_APP_PORT") continue;
    env[k] = v;
  }
  env.FOUNDERIVE_PANEL = "1";
  return env;
}

/** Sends `signal` to the program's whole process group (node-pty starts it as a session leader, so pid = group id). */
function killGroup(pid: number, signal: NodeJS.Signals): void {
  if (!Number.isInteger(pid) || pid <= 1) return; // never 0 (own group) or 1 (every process the user owns)
  try {
    process.kill(-pid, signal);
  } catch {
    // the group is already gone
  }
}

const execFileAsync = promisify(execFile);

export type Launcher = {
  /** The program to run for `tool`, given where it will run. May write files the program needs (the generated rules, the launch settings). */
  command: (tool: Tool, home: Home) => Promise<{ file: string; args: string[] }>;
  /** Whether each tool is installed. Async so the server never blocks the event loop to find out. */
  available: () => Promise<Record<Tool, boolean>>;
  /** Where the next program runs, resolved fresh each time and read-only: always the data folder (`exists: false` if it isn't there yet), or `unsafe`. */
  home: () => Promise<Home>;
  platform: "supported" | "windows";
  /** Loads the terminal library. Defaults to node-pty; a test can stand in a missing or fake one. */
  loadPty?: () => Promise<PtyModule>;
};

/**
 * Whether `tool` resolves to a program in `shell`'s login PATH. A timeout, or anything other than a clean
 * "not found", counts as available: unknown → let the founder try. Exported so this classification is testable
 * directly (e.g. `commandExists("sh")` → true, a made-up name → false) without needing claude or codex
 * installed, and the shell is a parameter precisely so a test can pin it instead of relying on the ambient one.
 */
export async function commandExists(tool: string, shell = process.env.SHELL || "/bin/zsh"): Promise<boolean> {
  // The name goes into a shell command line, so only plain command names are checked.
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(tool)) return false;
  try {
    await execFileAsync(shell, ["-l", "-c", `command -v ${tool}`], { timeout: AVAILABILITY_TIMEOUT_MS });
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { killed?: boolean; code?: number | string | null };
    if (!err.killed && typeof err.code === "number") return false;
    return true;
  }
}

/**
 * Runs the founder's own CLI through their login shell (so their PATH and sign-in are theirs), always in the founder's
 * data folder, with the app repo reachable as an added directory and a settings file that keeps the app's files and
 * git push out of reach. A data folder setting that is the app folder, is inside it (anywhere but founder-data/) or contains it starts nothing.
 */
export function loginShellLauncher(repo: string, opts: { shell?: string; now?: () => number } = {}): Launcher {
  const shell = opts.shell || process.env.SHELL || "/bin/zsh";
  const now = opts.now ?? Date.now;
  let cache: { at: number; value: Record<Tool, boolean> } | null = null;
  let inFlight: Promise<Record<Tool, boolean>> | null = null;

  const refresh = async (): Promise<Record<Tool, boolean>> => {
    const entries = await Promise.all(TOOLS.map(async (t) => [t, await commandExists(t, shell)] as const));
    const value = Object.fromEntries(entries) as Record<Tool, boolean>;
    cache = { at: now(), value };
    return value;
  };

  /**
   * Read-only: the server calls it on every page connect, so it never creates anything. A missing data folder is
   * `setup` with `exists: false, hasRecord: false`; Start (`command`) creates it. An existing folder without
   * `founder.md` is `setup` with `exists: true, hasRecord: false`; Start creates the record in it too. Throws when
   * the data folder setting itself is invalid (founderive.local.json); the panel shows that message.
   */
  const home = async (): Promise<Home> => {
    const dir = dataDir();
    if (!dataFolderIsSafe(repo, dir)) return panelHome({ repo, data: dir, safe: false, exists: false, hasRecord: false, setupComplete: false });
    if (!existsSync(dir)) return panelHome({ repo, data: dir, safe: true, exists: false, hasRecord: false, setupComplete: false });
    const founder = await readEntry("founder", "founder.md");
    return panelHome({ repo, data: dir, safe: true, exists: true, hasRecord: founder !== null, setupComplete: !!(founder?.ok && founder.data.setupComplete) });
  };

  /**
   * On Start, a data folder whose `founder.md` is missing gets the record created from the starter (initData never
   * overwrites), exactly what setup's first save does — whether the folder itself is missing or already exists but
   * is empty (a founder ran `mkdir` and pointed founderive.local.json at it, say). Checked fresh on disk, not from
   * the home passed in, since the folder may have changed since it was read. Only the default `<repo>/founder-data`,
   * the folder itself existing, or a folder whose parent exists: a configured folder on a drive that isn't connected
   * is refused rather than recreated somewhere the founder won't look.
   */
  const ensureDataFolder = async (dir: string): Promise<void> => {
    if (existsSync(path.join(dir, "founder.md"))) return;
    const isDefault = realPathOf(dir) === path.join(realPathOf(repo), "founder-data");
    if (!isDefault && !existsSync(dir) && !existsSync(path.dirname(path.resolve(dir)))) {
      throw new Error(`Your data folder isn't there (${dir}). Check its drive is connected, or fix founderive.local.json, then start again.`);
    }
    await initData();
  };

  return {
    command: async (tool, h) => {
      if (h.mode === "unsafe" || !h.data) throw new Error(unsafeDataFolderMessage(h.refused ?? h.cwd));
      // Checked fresh, not only from `h.exists`/`h.hasRecord`: the folder (or its record) may have changed since the home was read.
      await ensureDataFolder(h.data);
      // The rules are useful before setup too. writeAgentHome checks the data folder is safe again on its own.
      await writeAgentHome();
      // Codex gets no flags: it runs in the data folder and relies on its own default workspace sandbox to keep the repo read-only, which a founder running it with a permissive sandbox turns off.
      const extra = tool === "claude" ? claudeArgs(repo, await writeLaunchSettings(repo, h.data)) : [];
      return { file: shell, args: ["-l", "-c", [tool, ...extra.map(shellQuote)].join(" ")] };
    },
    available: () => {
      if (cache && now() - cache.at < AVAILABILITY_CACHE_MS) return Promise.resolve(cache.value);
      if (!inFlight) inFlight = refresh().finally(() => (inFlight = null));
      return inFlight;
    },
    home,
    platform: process.platform === "win32" ? "windows" : "supported",
  };
}

/** The one terminal session: at most one program running, with what it printed kept for a reconnecting page. */
export class TerminalSession {
  private pty: IPty | null = null;
  private tool: Tool | null = null;
  private currentHome: Home | null = null;
  private buffer = "";
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private outputListeners = new Set<(data: string) => void>();
  private exitListeners = new Set<(code: number | null) => void>();
  // Set synchronously, before the availability await, so a second "start" arriving on another socket while
  // this one is still mid-await is refused instead of racing it to spawn a second pty.
  private startingTool: Tool | null = null;
  private cancelStart: (() => void) | null = null;
  private size = { cols: 80, rows: 24 };
  // End was requested for the running program, so its leftovers are killed when it exits.
  private ending = false;

  constructor(private launcher: Launcher) {}

  get running(): Tool | null {
    return this.tool;
  }

  /** Where the running program lives, or null when nothing runs. */
  get home(): Home | null {
    return this.currentHome;
  }

  get scrollback(): string {
    return this.buffer;
  }

  onOutput(fn: (data: string) => void): () => void {
    this.outputListeners.add(fn);
    return () => this.outputListeners.delete(fn);
  }

  onExit(fn: (code: number | null) => void): () => void {
    this.exitListeners.add(fn);
    return () => this.exitListeners.delete(fn);
  }

  /** Starts claude or codex. Refuses when something is already running or starting, or the tool isn't installed. */
  async start(tool: Tool, cols: number, rows: number): Promise<void> {
    if (this.launcher.platform === "windows") throw new Error("The Claude panel isn't available on Windows yet. Use Claude Code in your own terminal.");
    if (this.pty || this.startingTool) throw new Error(`${this.tool ?? this.startingTool} is already running. End the session first.`);
    // Set the guard synchronously, before the only await below, so a second "start" (from another socket)
    // that runs its synchronous check before this one's await resolves sees the guard and is refused.
    this.startingTool = tool;
    let cancelled = false;
    this.cancelStart = () => {
      cancelled = true;
    };
    try {
      const available = await this.launcher.available();
      // Re-check after the await: end() may have cancelled this start while availability was pending.
      if (cancelled) return;
      if (!available[tool]) throw new Error(`${tool} isn't installed on this computer.`);
      let spawn: PtyModule["spawn"];
      try {
        ({ spawn } = await (this.launcher.loadPty ?? importNodePty)());
      } catch {
        throw new Error(PTY_MISSING);
      }
      if (cancelled) return;
      const home = await this.launcher.home();
      if (cancelled) return;
      if (home.mode === "unsafe") throw new Error(unsafeDataFolderMessage(home.refused ?? home.cwd));
      const { file, args } = await this.launcher.command(tool, home);
      if (cancelled) return;
      // Only mark the tool as running once spawn actually succeeds, so a failed spawn doesn't leave `running` set.
      const pty = spawn(file, args, { name: "xterm-256color", cols, rows, cwd: home.cwd, env: programEnv() });
      this.currentHome = home;
      this.size = { cols, rows };
      this.ending = false;
      this.buffer = "";
      this.tool = tool;
      this.pty = pty;
      pty.onData((data) => {
        this.buffer = (this.buffer + data).slice(-SCROLLBACK_BYTES);
        for (const fn of this.outputListeners) fn(data);
      });
      pty.onExit(({ exitCode }) => {
        if (this.endTimer) {
          clearTimeout(this.endTimer);
          this.endTimer = null;
        }
        // Ended by the founder: anything the program left behind in its group (a child that ignored SIGHUP) goes too.
        if (this.ending) killGroup(pty.pid, "SIGKILL");
        this.ending = false;
        this.pty = null;
        this.tool = null;
        this.currentHome = null;
        for (const fn of this.exitListeners) fn(exitCode ?? null);
      });
    } finally {
      this.startingTool = null;
      this.cancelStart = null;
    }
  }

  write(data: string): void {
    this.pty?.write(data);
  }

  /** Tells the program its new size. A resize racing the program's exit is ignored, never shown to the founder. */
  resize(cols: number, rows: number): void {
    if (!this.pty) return;
    this.size = { cols, rows };
    try {
      this.pty.resize(cols, rows);
    } catch {
      // the program is exiting; nothing to resize
    }
  }

  /**
   * Makes a running program repaint its whole screen (for a page that just reconnected, when the replayed
   * scrollback can't rebuild a full-screen program): a one-row size change and back, so it gets SIGWINCH.
   */
  redraw(): void {
    if (!this.pty) return;
    const pty = this.pty;
    const { cols, rows } = this.size;
    const nudged = { cols, rows: rows > 1 ? rows - 1 : rows + 1 };
    this.resize(nudged.cols, nudged.rows);
    setTimeout(() => {
      // Restore the size unless the program has gone, or a page has sent its own size meanwhile.
      if (this.pty === pty && this.size.cols === nudged.cols && this.size.rows === nudged.rows) this.resize(cols, rows);
    }, REDRAW_DELAY_MS).unref();
  }

  /**
   * Asks the program and everything it started to leave (SIGHUP to its process group); if the program hasn't
   * left within the grace period, insists (SIGKILL to the group). When the program exits, anything still left
   * in its group is killed too. Called while a start is still pending, it cancels that start: nothing is spawned.
   */
  end(): void {
    if (this.cancelStart) {
      this.cancelStart();
      this.cancelStart = null;
      return;
    }
    if (!this.pty) return;
    const pty = this.pty;
    this.ending = true;
    killGroup(pty.pid, "SIGHUP");
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => {
      this.endTimer = null;
      killGroup(pty.pid, "SIGKILL");
    }, END_GRACE_MS);
    this.endTimer.unref();
  }

  /** For the server shutting down: End, then wait for the program to leave (up to the grace period), then kill its group. */
  async shutdown(): Promise<void> {
    if (this.cancelStart) return this.end();
    if (!this.pty) return;
    const pid = this.pty.pid;
    const exited = new Promise<void>((resolve) => {
      const off = this.onExit(() => {
        off();
        resolve();
      });
    });
    this.end();
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, END_GRACE_MS).unref())]);
    killGroup(pid, "SIGKILL");
  }
}
