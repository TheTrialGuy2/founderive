// Started by start.mjs: the Claude panel's terminal server. Reads its token and ports from the environment.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startTerminalServer } from "../src/terminal/server";
import { loginShellLauncher } from "../src/terminal/session";

const token = process.env.FOUNDERIVE_TERMINAL_TOKEN ?? "";
const terminalPort = Number(process.env.FOUNDERIVE_TERMINAL_PORT);
const appPort = Number(process.env.FOUNDERIVE_APP_PORT);
if (!/^[0-9a-f]{64}$/.test(token) || !terminalPort || !appPort) {
  console.error("The Claude panel's terminal needs to be started by node start.mjs.");
  process.exit(1);
}
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
try {
  const server = await startTerminalServer({ token, appPort, terminalPort, launcher: loginShellLauncher(repoRoot) });
  console.log(`Claude panel ready (terminal on 127.0.0.1:${terminalPort}).`);
  // When Founderive stops, the program running in the panel (and anything it started) stops with it.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(signal, () => {
      setTimeout(() => process.exit(0), 4000).unref(); // never linger if close() hangs
      void server.close().finally(() => process.exit(0));
    });
  }
} catch (error) {
  console.error(`The Claude panel couldn't start: ${(error as Error).message}. The rest of Founderive works; run pnpm pty-check in web/ for details.`);
  process.exit(1);
}
