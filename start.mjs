#!/usr/bin/env node
// One command for founders: checks Node, installs what's needed, starts Founderive on this computer and opens the browser.
// Set FOUNDERIVE_NO_OPEN=1 to start it without opening a browser (it still prints the address).
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(root, "web");
const shell = process.platform === "win32";
const noOpen = process.env.FOUNDERIVE_NO_OPEN === "1";

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
if (install.status !== 0) {
  console.error(
    "\nInstalling dependencies failed (see the messages above). Check your internet connection, then run node start.mjs again. If it keeps failing, delete web/node_modules and try once more.",
  );
  process.exit(install.status ?? 1);
}

console.log("Starting Founderive…");
const dev = spawn("pnpm", ["dev"], { cwd: web, stdio: ["inherit", "pipe", "inherit"], shell });
let output = "";
let announced = false;
dev.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (announced) return;
  output += String(chunk);
  // Next prints "- Local: http://..." before "Ready"; chunks can split either line, so match the whole buffer.
  const local = /Local:\s+(https?:\/\/\S+)/.exec(stripAnsi(output));
  if (!local || !/Ready/i.test(output)) return;
  announced = true;
  const url = local[1].replace(/\/$/, "").replace("//localhost", "//127.0.0.1"); // the server binds IPv4 only
  console.log(`\nFounderive is running at ${url}. Keep this window open while you use it; press Ctrl+C to stop.`);
  console.log(`Your data: ${resolveDataDir()}\n`);
  if (!noOpen) openBrowser(url);
});
dev.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(signal));

function stop(signal) {
  if (process.platform === "win32" && dev.pid) {
    // dev runs through a shell on Windows, so killing it alone would leave the Next server running.
    spawnSync("taskkill", ["/pid", String(dev.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    dev.kill(signal);
  }
}

function openBrowser(url) {
  const [cmd, args] = process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  let told = false;
  const fallback = () => {
    if (told) return;
    told = true;
    console.log(`Open ${url} in your browser.`);
  };
  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", fallback);
  child.on("exit", (code) => {
    if (code !== 0) fallback();
  });
  child.unref();
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

// Tiny duplicate of web/src/store/paths.ts's dataDir() resolution, kept in plain JS here since this
// script runs before (and without) the TS store. Order: env FOUNDER_DATA_DIR, then founderive.local.json
// at the repo root (supports "~/" and relative paths), then the default <repo root>/founder-data.
// Unlike the store, this is just for a friendly status line, so a bad config file quietly falls back
// to the default instead of throwing; the app itself reports a bad founderive.local.json in detail.
function resolveDataDir() {
  if (process.env.FOUNDER_DATA_DIR) return path.resolve(process.env.FOUNDER_DATA_DIR);

  const configPath = process.env.FOUNDERIVE_LOCAL_CONFIG ?? path.join(root, "founderive.local.json");
  const configured = readConfiguredDataDir(configPath);
  if (configured) {
    const expanded =
      configured === "~" ? os.homedir() : configured.startsWith("~/") ? path.join(os.homedir(), configured.slice(2)) : configured;
    return path.resolve(path.isAbsolute(expanded) ? expanded : path.join(root, expanded));
  }

  return path.resolve(path.join(root, "founder-data"));
}

function readConfiguredDataDir(configPath) {
  if (!fs.existsSync(configPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return typeof parsed?.dataDir === "string" ? parsed.dataDir : null;
  } catch {
    return null;
  }
}
