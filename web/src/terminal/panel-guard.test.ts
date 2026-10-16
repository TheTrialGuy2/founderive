import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = fileURLToPath(new URL("../../scripts/panel-guard.mjs", import.meta.url));

type Run = { stdout: string; stderr: string; status: number | null };

function guard(env: Record<string, string>, input: string): Run {
  const r = spawnSync(process.execPath, [SCRIPT], { env: { NODE_ENV: "test", PATH: process.env.PATH, ...env }, input, encoding: "utf8" });
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

const call = (tool: string, toolInput: Record<string, string>, cwd: string) =>
  JSON.stringify({ session_id: "s", hook_event_name: "PreToolUse", tool_name: tool, tool_input: toolInput, cwd });

function expectDeny(r: Run, data: string) {
  expect(r.status).toBe(0);
  expect(JSON.parse(r.stdout)).toEqual({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Founderive keeps the app's files read-only from the panel. Write inside your data folder (${data}) instead.`,
    },
  });
}

function expectAllow(r: Run) {
  expect(r.status).toBe(0);
  expect(r.stdout).toBe("");
}

function expectDenyCantCheck(r: Run, cause: string) {
  expect(r.status).toBe(0);
  expect(JSON.parse(r.stdout)).toEqual({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `Founderive's write guard couldn't check this write (${cause}). Nothing in the app can be written from the panel until it can.`,
    },
  });
}

let tmp: string;
let repo: string;
let settings: string;
let elsewhere: string;
beforeEach(async () => {
  tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), "founderive-guard-")));
  repo = path.join(tmp, "app");
  settings = path.join(tmp, "panel-settings");
  elsewhere = path.join(tmp, "elsewhere");
  await mkdir(path.join(repo, "web", "src"), { recursive: true });
  await mkdir(settings);
  await mkdir(elsewhere);
});
afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

for (const where of ["inside the repo (<repo>/founder-data)", "outside the repo"] as const) {
  describe(`panel-guard, data folder ${where}`, () => {
    let data: string;
    let env: Record<string, string>;
    beforeEach(async () => {
      data = where === "outside the repo" ? path.join(tmp, "Lantern") : path.join(repo, "founder-data");
      await mkdir(data);
      env = { FOUNDERIVE_GUARD_REPO: repo, FOUNDERIVE_GUARD_DATA: data, FOUNDERIVE_GUARD_SETTINGS: settings };
    });

    it("allows a write under the data folder, even a new folder in it", () => {
      expectAllow(guard(env, call("Write", { file_path: path.join(data, "notes", "ok.md") }, data)));
      expectAllow(guard(env, call("Edit", { file_path: path.join(data, "founder.md") }, data)));
    });

    it("refuses a new root file without a dot, and a new root folder", () => {
      expectDeny(guard(env, call("Write", { file_path: path.join(repo, "NEWFILE") }, data)), data);
      expectDeny(guard(env, call("Write", { file_path: path.join(repo, "new-folder", "file.ts") }, data)), data);
    });

    it("refuses an existing app file, by Edit and by NotebookEdit's notebook_path", () => {
      expectDeny(guard(env, call("Edit", { file_path: path.join(repo, "web", "src", "x.ts") }, data)), data);
      expectDeny(guard(env, call("NotebookEdit", { notebook_path: path.join(repo, "web", "n.ipynb") }, data)), data);
    });

    it("refuses a write into the settings folder", () => {
      expectDeny(guard(env, call("Write", { file_path: path.join(settings, "claude-settings.json") }, data)), data);
    });

    it("allows a write outside both the repo and the settings folder", () => {
      expectAllow(guard(env, call("Write", { file_path: path.join(elsewhere, "x.md") }, data)));
    });

    it("resolves a relative path against cwd: allowed from the data folder, refused when it climbs into the app", () => {
      expectAllow(guard(env, call("Write", { file_path: "notes/ok.md" }, data)));
      const climb = where === "outside the repo" ? path.relative(data, path.join(repo, "NEWFILE")) : "../NEWFILE";
      expectDeny(guard(env, call("Write", { file_path: climb }, data)), data);
    });

    it("follows a symlink in the data folder that leads into the app", async () => {
      await symlink(path.join(repo, "web"), path.join(data, "sneaky"));
      expectDeny(guard(env, call("Write", { file_path: path.join(data, "sneaky", "x.ts") }, data)), data);
    });

    it("denies when one of several path fields is in the app, even when another is in the data folder", () => {
      expectDeny(guard(env, call("MultiEdit", { file_path: path.join(data, "ok.md"), notebook_path: path.join(repo, "web", "n.ipynb") }, data)), data);
    });
  });
}

describe("panel-guard, failing closed", () => {
  it("denies on malformed stdin, with one line on stderr", () => {
    const r = guard({ FOUNDERIVE_GUARD_REPO: "/r/app", FOUNDERIVE_GUARD_DATA: "/d" }, "{not json");
    expectDenyCantCheck(r, "malformed input");
    expect(r.stderr.trim().split("\n")).toHaveLength(1);
  });

  // The whole decision runs inside one top-level try/catch now (defense in depth, on top of the per-field guards
  // above). There's no way to make a throwing getter arrive through JSON on stdin, so this just reaffirms that the
  // existing malformed-stdin case still denies closed after wrapping the decision this way.
  it("still denies closed on malformed stdin now that the whole decision is wrapped in one top-level try/catch", () => {
    const r = guard({ FOUNDERIVE_GUARD_REPO: "/r/app", FOUNDERIVE_GUARD_DATA: "/d", FOUNDERIVE_GUARD_SETTINGS: "/s" }, "{not json");
    expectDenyCantCheck(r, "malformed input");
  });

  it("denies when the repo isn't set", () => {
    const r = guard({}, call("Write", { file_path: "/anywhere/NEWFILE" }, "/"));
    expectDenyCantCheck(r, "missing guard settings");
    expect(r.stderr).toContain("missing guard settings");
  });

  it("denies when the tool call has no file_path, notebook_path or path", () => {
    const r = guard({ FOUNDERIVE_GUARD_REPO: "/r/app" }, call("Bash", {}, "/"));
    expectDenyCantCheck(r, "no file path");
  });

  it("with no data folder set, refuses the whole repo", () => {
    const r = guard({ FOUNDERIVE_GUARD_REPO: repo }, call("Write", { file_path: path.join(repo, "founder-data", "x.md") }, repo));
    expectDeny(r, "outside the Founderive app folder");
  });
});
