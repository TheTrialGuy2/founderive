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
  });
}

describe("panel-guard, failing open", () => {
  it("prints nothing and exits 0 on malformed stdin, with one line on stderr", () => {
    const r = guard({ FOUNDERIVE_GUARD_REPO: "/r/app", FOUNDERIVE_GUARD_DATA: "/d" }, "{not json");
    expectAllow(r);
    expect(r.stderr.trim().split("\n")).toHaveLength(1);
  });

  it("prints nothing and exits 0 when the repo isn't set", () => {
    const r = guard({}, call("Write", { file_path: "/anywhere/NEWFILE" }, "/"));
    expectAllow(r);
    expect(r.stderr).toContain("FOUNDERIVE_GUARD_REPO");
  });

  it("with no data folder set, refuses the whole repo", () => {
    const r = guard({ FOUNDERIVE_GUARD_REPO: repo }, call("Write", { file_path: path.join(repo, "founder-data", "x.md") }, repo));
    expectDeny(r, "outside the Founderive app folder");
  });
});
