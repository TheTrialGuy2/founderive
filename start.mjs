#!/usr/bin/env node
// One command for founders: checks Node, installs what's needed, starts Founderive on this computer and opens the browser.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(root, "web");
const APP_URL = "http://localhost:3000";
const shell = process.platform === "win32";

const [major] = process.versions.node.split(".").map(Number);
if (major < 24) {
  console.error(`Founderive needs Node 24 or newer (you have ${process.versions.node}). Install it from https://nodejs.org, then run this again.`);
  process.exit(1);
}

const hasPnpm = () => spawnSync("pnpm", ["--version"], { stdio: "ignore", shell }).status === 0;
if (!hasPnpm()) {
  console.log("Setting up pnpm (one time)…");
  spawnSync("corepack", ["enable", "pnpm"], { stdio: "inherit", shell });
  if (!hasPnpm()) {
    console.error("Couldn't set up pnpm. Run `npm install -g pnpm`, then run this again.");
    process.exit(1);
  }
}

console.log("Checking dependencies (the first run takes a minute)…");
const install = spawnSync("pnpm", ["install", "--frozen-lockfile"], { cwd: web, stdio: "inherit", shell });
if (install.status !== 0) process.exit(install.status ?? 1);

console.log(`Starting Founderive at ${APP_URL} …`);
const dev = spawn("pnpm", ["dev"], { cwd: web, stdio: ["inherit", "pipe", "inherit"], shell });
let opened = false;
dev.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!opened && /Ready/i.test(String(chunk))) {
    opened = true;
    openBrowser(APP_URL);
  }
});
dev.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => dev.kill(signal));

function openBrowser(url) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", () => console.log(`Open ${url} in your browser.`));
  child.unref();
  console.log(`\nFounderive is open at ${url}. Keep this window open while you use it; press Ctrl+C to stop.\n`);
}
