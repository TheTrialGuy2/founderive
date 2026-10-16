// Founderive's Claude panel: a PreToolUse hook for Edit, Write, NotebookEdit and MultiEdit (see guardHook in
// src/terminal/guardrails.ts). Claude Code sends the tool call as JSON on stdin. The hook refuses a path inside the app
// repo that isn't inside the data folder, and the panel's settings folder; it allows everything else.
//
// Environment (real paths, set by the generated settings):
//   FOUNDERIVE_GUARD_REPO      the app repo (required)
//   FOUNDERIVE_GUARD_DATA      the data folder (when absent, nothing in the repo is spared)
//   FOUNDERIVE_GUARD_SETTINGS  the panel's settings folder
//
// Refusing: print the PreToolUse deny JSON and exit 0. Allowing: print nothing and exit 0. Anything the hook can't make
// sense of (malformed stdin, no FOUNDERIVE_GUARD_REPO, no path field in the tool call) is also a deny, with one line on
// stderr: the hook fails closed, so nothing in the app can be written from the panel until it can check the write.
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

function deny(reason) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })}\n`,
  );
  process.exit(0);
}

/** Fail closed: the hook couldn't check the write, so it's denied, with one line on stderr. */
function denyCantCheck(cause) {
  process.stderr.write(`panel-guard: ${cause}; denying (the hook fails closed)\n`);
  deny(`Founderive's write guard couldn't check this write (${cause}). Nothing in the app can be written from the panel until it can.`);
}

// Defense in depth: the per-field checks below already deny closed on every malformed input or environment they
// recognize, but the whole decision runs inside one more try/catch so an unforeseen crash anywhere in it (a future
// change, an edge case not yet thought of) still denies closed instead of letting an uncaught exception escape
// (which Claude Code could otherwise treat as "no decision", i.e. allow).
try {
  let input = "";
  try {
    input = fs.readFileSync(0, "utf8");
  } catch {
    denyCantCheck("malformed input");
  }

  let call;
  try {
    call = JSON.parse(input);
  } catch {
    denyCantCheck("malformed input");
  }

  const repoEnv = process.env.FOUNDERIVE_GUARD_REPO;
  if (!repoEnv) denyCantCheck("missing guard settings");

  const toolInput = call && typeof call === "object" ? call.tool_input : null;
  const targets = ["file_path", "notebook_path", "path"]
    .map((field) => (toolInput && typeof toolInput === "object" ? toolInput[field] : undefined))
    .filter((value) => typeof value === "string" && value !== "");
  if (targets.length === 0) denyCantCheck("no file path");

  const cwd = typeof call.cwd === "string" && call.cwd !== "" ? call.cwd : process.cwd();
  const reals = targets.map((target) => realPathOf(path.isAbsolute(target) ? target : path.resolve(cwd, target)));

  const repo = realPathOf(repoEnv);
  const data = process.env.FOUNDERIVE_GUARD_DATA ? realPathOf(process.env.FOUNDERIVE_GUARD_DATA) : null;
  const settings = process.env.FOUNDERIVE_GUARD_SETTINGS ? realPathOf(process.env.FOUNDERIVE_GUARD_SETTINGS) : null;

  // The data folder is spared only when it doesn't hold the repo itself (the panel never launches with one that does).
  const blocked = reals.some((real) => {
    const spared = data !== null && !within(data, repo) && within(data, real);
    const inApp = within(repo, real) && !spared;
    const inSettings = settings !== null && within(settings, real);
    return inApp || inSettings;
  });

  if (blocked) {
    const where = data ?? "outside the Founderive app folder";
    deny(`Founderive keeps the app's files read-only from the panel. Write inside your data folder (${where}) instead.`);
  }
  process.exit(0);
} catch {
  denyCantCheck("malformed input");
}
