import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeArgs, denyRules, guardHook, panelHome, removeLaunchSettings, ROOT_FILES, shellQuote, unsafeDataFolderMessage, writeLaunchSettings } from "./guardrails";

afterEach(async () => {
  await removeLaunchSettings();
});

describe("panelHome", () => {
  it("is the data folder once setup is complete", () => {
    expect(panelHome({ repo: "/r/app", data: "/Users/sam/Founderive/Lantern", safe: true, exists: true, setupComplete: true })).toEqual({
      cwd: "/Users/sam/Founderive/Lantern",
      mode: "record",
      name: "Lantern",
      data: "/Users/sam/Founderive/Lantern",
      exists: true,
    });
  });
  it("is the data folder before setup too", () => {
    expect(panelHome({ repo: "/r/app", data: "/r/app/founder-data", safe: true, exists: true, setupComplete: false })).toEqual({ cwd: "/r/app/founder-data", mode: "setup", name: "founder-data", data: "/r/app/founder-data", exists: true });
  });
  it("is setup, and says the folder isn't there yet, when the data folder is missing", () => {
    expect(panelHome({ repo: "/r/app", data: "/r/app/founder-data", safe: true, exists: false, setupComplete: false })).toEqual({ cwd: "/r/app/founder-data", mode: "setup", name: "founder-data", data: "/r/app/founder-data", exists: false });
  });
  it("is unsafe, with no data folder, when the setting is refused, and keeps the refused path for the message", () => {
    expect(panelHome({ repo: "/r/app", data: "/r/app/web", safe: false, exists: true, setupComplete: true })).toEqual({ cwd: "/r/app", mode: "unsafe", name: "app", data: null, exists: false, refused: "/r/app/web" });
    expect(unsafeDataFolderMessage("/r/app/web")).toBe(
      "The data folder setting is the Founderive app folder, is inside it, or contains it (/r/app/web). Move it outside the app folder, or use founder-data/, then start again.",
    );
  });
});

describe("denyRules", () => {
  it("denies the whole repo when the data folder is outside it, and git push", () => {
    expect(denyRules("/r/app", null)).toEqual(["Edit(//r/app/**)", "Bash(git push *)", "Bash(git push:*)"]);
  });
  it("for <repo>/founder-data: every other top-level entry by type, the named root files, new dotted root files, and git push", () => {
    const deny = denyRules("/r/app", [
      { name: "web", isDirectory: true },
      { name: "founder-data", isDirectory: true },
      { name: "LICENSE", isDirectory: false },
      { name: "founderive-mvp", isDirectory: true },
    ]);
    expect(deny).toEqual([
      "Edit(//r/app/web/**)",
      "Edit(//r/app/LICENSE)",
      "Edit(//r/app/founderive-mvp/**)",
      ...ROOT_FILES.map((f) => `Edit(//r/app/${f})`),
      "Edit(//r/app/*.*)",
      "Bash(git push *)",
      "Bash(git push:*)",
    ]);
    // Never a pattern that also matches the founder-data folder (and so, under gitignore semantics, everything in it).
    expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
    expect(deny).not.toContain("Edit(//r/app/*)");
    expect(deny).not.toContain("Edit(//r/app/**)");
  });
});

describe("writeLaunchSettings", () => {
  let tmpRepo: string;
  const deniedBy = async (data: string | null) => JSON.parse(await readFile(await writeLaunchSettings(tmpRepo, data), "utf8")).permissions.deny as string[];
  beforeEach(async () => {
    tmpRepo = await realpath(await mkdtemp(path.join(os.tmpdir(), "founderive-test-")));
    await mkdir(path.join(tmpRepo, "web", "src"), { recursive: true });
    await mkdir(path.join(tmpRepo, "founder-data"));
    await mkdir(path.join(tmpRepo, ".claude"));
    await writeFile(path.join(tmpRepo, "LICENSE"), "");
  });
  afterEach(async () => {
    await rm(tmpRepo, { recursive: true, force: true });
  });

  it("denies the whole repo when the data folder is outside it", async () => {
    const tmpData = await mkdtemp(path.join(os.tmpdir(), "founderive-data-"));
    try {
      const deny = await deniedBy(tmpData);
      expect(deny).toContain(`Edit(/${tmpRepo}/**)`);
      expect(deny).toContain("Bash(git push *)");
      expect(deny).toContain("Bash(git push:*)");
    } finally {
      await rm(tmpData, { recursive: true, force: true });
    }
  });

  it("spares only <repo>/founder-data: LICENSE as a file, web/** and .claude/** denied, founder-data never", async () => {
    const deny = await deniedBy(path.join(tmpRepo, "founder-data"));
    expect(deny).toContain(`Edit(/${tmpRepo}/web/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/.claude/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/LICENSE)`);
    expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
    expect(deny).not.toContain(`Edit(/${tmpRepo}/**)`);
    expect(deny).not.toContain(`Edit(/${tmpRepo}/*)`);
  });

  it("denies founderive.local.json whether or not it exists, so it can't be created to move the data folder", async () => {
    expect(await deniedBy(path.join(tmpRepo, "founder-data"))).toContain(`Edit(/${tmpRepo}/founderive.local.json)`);
    await writeFile(path.join(tmpRepo, "founderive.local.json"), "{}");
    expect(await deniedBy(path.join(tmpRepo, "founder-data"))).toContain(`Edit(/${tmpRepo}/founderive.local.json)`);
  });

  it("spares founder-data even before it exists", async () => {
    await rm(path.join(tmpRepo, "founder-data"), { recursive: true });
    const deny = await deniedBy(path.join(tmpRepo, "founder-data"));
    expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
    expect(deny).toContain(`Edit(/${tmpRepo}/web/**)`);
  });

  it("denies the whole repo for any other data folder inside it, or none", async () => {
    await mkdir(path.join(tmpRepo, "web", "founder-data"));
    expect(await deniedBy(path.join(tmpRepo, "web", "founder-data"))).toContain(`Edit(/${tmpRepo}/**)`);
    expect(await deniedBy(tmpRepo)).toContain(`Edit(/${tmpRepo}/**)`);
    expect(await deniedBy(null)).toContain(`Edit(/${tmpRepo}/**)`);
  });

  it("writes the rules for the repo as given and for its real path when a symlink leads to it", async () => {
    const linkParent = await mkdtemp(path.join(os.tmpdir(), "founderive-link-"));
    try {
      const linked = path.join(linkParent, "app");
      await symlink(tmpRepo, linked);
      const deny = JSON.parse(await readFile(await writeLaunchSettings(linked, path.join(linked, "founder-data")), "utf8")).permissions.deny as string[];
      expect(deny).toContain(`Edit(/${linked}/web/**)`);
      expect(deny).toContain(`Edit(/${tmpRepo}/web/**)`);
      expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
    } finally {
      await rm(linkParent, { recursive: true, force: true });
    }
  });

  it("denies the settings folder itself", async () => {
    const file = await writeLaunchSettings(tmpRepo, null);
    const deny = JSON.parse(await readFile(file, "utf8")).permissions.deny as string[];
    expect(deny).toContain(`Edit(/${path.dirname(file)}/**)`);
  });

  it("adds the guard hook for Edit, Write and NotebookEdit, with the real repo, data and settings paths shell-quoted", async () => {
    const data = path.join(tmpRepo, "founder-data");
    const file = await writeLaunchSettings(tmpRepo, data);
    const settings = JSON.parse(await readFile(file, "utf8"));
    const settingsDir = await realpath(path.dirname(file));
    expect(settings.hooks).toEqual({
      PreToolUse: [
        {
          matcher: "Edit|Write|NotebookEdit",
          hooks: [
            {
              type: "command",
              command: `FOUNDERIVE_GUARD_REPO=${shellQuote(tmpRepo)} FOUNDERIVE_GUARD_DATA=${shellQuote(data)} FOUNDERIVE_GUARD_SETTINGS=${shellQuote(settingsDir)} node ${shellQuote(path.join(tmpRepo, "web", "scripts", "panel-guard.mjs"))}`,
            },
          ],
        },
      ],
    });
    // The deny rules stay alongside the hook.
    expect(settings.permissions.deny).toContain(`Edit(/${tmpRepo}/web/**)`);
  });

  it("quotes a path with a space or a quote in the hook command", () => {
    expect(guardHook({ repo: "/Users/sam/My App", data: "/Users/sam/it's data", settings: "/tmp/s" }).PreToolUse[0].hooks[0].command).toBe(
      "FOUNDERIVE_GUARD_REPO='/Users/sam/My App' FOUNDERIVE_GUARD_DATA='/Users/sam/it'\\''s data' FOUNDERIVE_GUARD_SETTINGS='/tmp/s' node '/Users/sam/My App/web/scripts/panel-guard.mjs'",
    );
  });

  it("uses the repo's real path in the hook when a symlink leads to it", async () => {
    const linkParent = await mkdtemp(path.join(os.tmpdir(), "founderive-link-"));
    try {
      const linked = path.join(linkParent, "app");
      await symlink(tmpRepo, linked);
      const settings = JSON.parse(await readFile(await writeLaunchSettings(linked, path.join(linked, "founder-data")), "utf8"));
      const command = settings.hooks.PreToolUse[0].hooks[0].command as string;
      expect(command).toContain(`FOUNDERIVE_GUARD_REPO=${shellQuote(tmpRepo)} `);
      expect(command).toContain(`FOUNDERIVE_GUARD_DATA=${shellQuote(path.join(tmpRepo, "founder-data"))} `);
      expect(command).not.toContain(linked);
    } finally {
      await rm(linkParent, { recursive: true, force: true });
    }
  });

  it("removeLaunchSettings deletes the file writeLaunchSettings wrote", async () => {
    const file = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
    expect(existsSync(file)).toBe(true);
    await removeLaunchSettings();
    expect(existsSync(file)).toBe(false);
  });

  it("recreates its settings folder if something (e.g. macOS) cleaned it out from under a long-running process", async () => {
    const file = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
    await rm(path.dirname(file), { recursive: true, force: true });
    expect(existsSync(file)).toBe(false);
    const file2 = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
    expect(existsSync(file2)).toBe(true);
  });
});

describe("claudeArgs", () => {
  it("adds the repo as a directory and the settings file", () => {
    const settings = "/tmp/x/claude-settings.json";
    expect(claudeArgs("/r/app", settings)).toEqual(["--add-dir", "/r/app", "--settings", settings]);
  });
});

describe("shellQuote", () => {
  it("single-quotes and escapes embedded quotes", () => {
    expect(shellQuote("/Users/sam/My Venture")).toBe("'/Users/sam/My Venture'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});
