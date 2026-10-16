// Founderive's Claude panel: a PreToolUse hook for Edit, Write and NotebookEdit (see guardHook in
// src/terminal/guardrails.ts). Claude Code sends the tool call as JSON on stdin. The hook refuses a path inside the app
// repo that isn't inside the data folder, and the panel's settings folder; it allows everything else.
//
// Environment (real paths, set by the generated settings):
//   FOUNDERIVE_GUARD_REPO      the app repo (required)
//   FOUNDERIVE_GUARD_DATA      the data folder (when absent, nothing in the repo is spared)
//   FOUNDERIVE_GUARD_SETTINGS  the panel's settings folder
//
// Refusing: print the PreToolUse deny JSON and exit 0. Allowing: print nothing and exit 0. Anything unexpected (bad
// stdin, no repo set) also prints nothing and exits 0, with one line on stderr: the hook fails open, and the deny
// rules in the same settings file still apply.
import fs from "node:fs";
import path from "node:path";

/** The real path of `p`, via its nearest existing ancestor, following a symlink that doesn't resolve yet (as realPathOf). */
function realPathOf(p, hops = 0) {
  const abs = path.resolve(p);
  try {
    return fs.realpathSync.native(abs);
  } catch {
    // doesn't fully resolve: resolve the parent, then look at this name itself
  }
  const parent = path.dirname(abs);
  if (parent === abs || hops > 40) return abs;
  const candidate = path.join(realPathOf(parent, hops + 1), path.basename(abs));
  try {
    if (fs.lstatSync(candidate).isSymbolicLink()) return realPathOf(path.resolve(path.dirname(candidate), fs.readlinkSync(candidate)), hops + 1);
  } catch {
    // not there at all: the name as it would be created
  }
  return candidate;
}

/** Whether `child` is `parent` or inside it (both already resolved). */
function within(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!path.isAbsolute(rel) && rel.split(path.sep)[0] !== "..");
}

function failOpen(why) {
  process.stderr.write(`panel-guard: ${why}; allowing (the deny rules still apply)\n`);
  process.exit(0);
}

let input = "";
try {
  input = fs.readFileSync(0, "utf8");
} catch (error) {
  failOpen(`couldn't read stdin (${error.message})`);
}

let call;
try {
  call = JSON.parse(input);
} catch {
  failOpen("stdin isn't JSON");
}

const repoEnv = process.env.FOUNDERIVE_GUARD_REPO;
if (!repoEnv) failOpen("FOUNDERIVE_GUARD_REPO isn't set");

const toolInput = call && typeof call === "object" ? call.tool_input : null;
const target = toolInput && typeof toolInput === "object" ? (toolInput.file_path ?? toolInput.notebook_path) : undefined;
if (typeof target !== "string" || target === "") failOpen("no file_path or notebook_path in the tool call");

const cwd = typeof call.cwd === "string" && call.cwd !== "" ? call.cwd : process.cwd();
const real = realPathOf(path.isAbsolute(target) ? target : path.resolve(cwd, target));

const repo = realPathOf(repoEnv);
const data = process.env.FOUNDERIVE_GUARD_DATA ? realPathOf(process.env.FOUNDERIVE_GUARD_DATA) : null;
const settings = process.env.FOUNDERIVE_GUARD_SETTINGS ? realPathOf(process.env.FOUNDERIVE_GUARD_SETTINGS) : null;

// The data folder is spared only when it doesn't hold the repo itself (the panel never launches with one that does).
const spared = data !== null && !within(data, repo) && within(data, real);
const inApp = within(repo, real) && !spared;
const inSettings = settings !== null && within(settings, real);

if (inApp || inSettings) {
  const where = data ?? "outside the Founderive app folder";
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `Founderive keeps the app's files read-only from the panel. Write inside your data folder (${where}) instead.`,
      },
    })}\n`,
  );
}
process.exit(0);
