import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeArgs, dataFolderIsSafe, denyRules, panelHome, removeLaunchSettings, shellQuote, writeLaunchSettings } from "./guardrails";

afterEach(async () => {
  await removeLaunchSettings();
});

describe("panelHome", () => {
  it("is the data folder once setup is complete", () => {
    expect(panelHome({ repo: "/r/app", data: "/Users/sam/Founderive/Lantern", setupComplete: true })).toEqual({
      cwd: "/Users/sam/Founderive/Lantern",
      mode: "record",
      name: "Lantern",
      data: "/Users/sam/Founderive/Lantern",
    });
  });
  it("is the repo before setup, or when there is no data folder, but still carries the data folder when one exists", () => {
    expect(panelHome({ repo: "/r/app", data: "/r/app/founder-data", setupComplete: false })).toEqual({ cwd: "/r/app", mode: "repo", name: "app", data: "/r/app/founder-data" });
    expect(panelHome({ repo: "/r/app", data: null, setupComplete: false })).toEqual({ cwd: "/r/app", mode: "repo", name: "app", data: null });
  });
});

describe("dataFolderIsSafe", () => {
  it("refuses the repo itself, a folder containing the repo, and the app's own folders", () => {
    expect(dataFolderIsSafe("/r/app", "/r/app")).toBe(false);
    expect(dataFolderIsSafe("/r/app", "/r/app/")).toBe(false);
    expect(dataFolderIsSafe("/r/app", "/r")).toBe(false);
    expect(dataFolderIsSafe("/r/app", "/")).toBe(false);
    for (const top of ["web", ".git", ".claude", "docs", "starter-data"]) expect(dataFolderIsSafe("/r/app", `/r/app/${top}/founder-data`)).toBe(false);
  });
  it("accepts a folder outside the repo, or inside it under another path", () => {
    expect(dataFolderIsSafe("/r/app", "/Users/sam/Founderive/Lantern")).toBe(true);
    expect(dataFolderIsSafe("/r/app", "/r/app-data")).toBe(true);
    expect(dataFolderIsSafe("/r/app", "/r/app/founder-data")).toBe(true);
    expect(dataFolderIsSafe("/r/app", "/r/app/..data")).toBe(true);
    expect(dataFolderIsSafe("/r/app", "/r/app/webby/founder-data")).toBe(true);
  });
});

describe("denyRules", () => {
  it("denies each entry with an absolute // path except the one kept, files and folders by entry type, and git push", () => {
    expect(denyRules("/r/app", [{
      dir: "/r/app",
      keep: "founder-data",
      entries: [
        { name: "web", isDirectory: true },
        { name: "founder-data", isDirectory: true },
        { name: "LICENSE", isDirectory: false },
        { name: "scripts", isDirectory: true },
      ],
    }])).toEqual(["Edit(//r/app/web/**)", "Edit(//r/app/LICENSE)", "Edit(//r/app/scripts/**)", "Bash(git push *)", "Bash(git push:*)"]);
  });
  it("denies a level that keeps nothing as a whole too, so new files there are covered", () => {
    expect(denyRules("/r/app", [{ dir: "/r/app", keep: null, entries: [{ name: "web", isDirectory: true }] }])).toEqual([
      "Edit(//r/app/web/**)",
      "Edit(//r/app/**)",
      "Bash(git push *)",
      "Bash(git push:*)",
    ]);
  });
});

describe("writeLaunchSettings", () => {
  let tmpRepo: string;
  const deniedBy = async (data: string | null) => JSON.parse(await readFile(await writeLaunchSettings(tmpRepo, data), "utf8")).permissions.deny as string[];
  beforeEach(async () => {
    tmpRepo = await mkdtemp(path.join(os.tmpdir(), "founderive-test-"));
    await mkdir(path.join(tmpRepo, "web", "src"), { recursive: true });
    await mkdir(path.join(tmpRepo, "founder-data"));
    await mkdir(path.join(tmpRepo, ".claude"));
    await writeFile(path.join(tmpRepo, "LICENSE"), "");
    await writeFile(path.join(tmpRepo, "founderive.local.json"), "");
  });
  afterEach(async () => {
    await rm(tmpRepo, { recursive: true, force: true });
  });

  it("denies every top-level entry, and the repo as a whole, when the data folder is outside the repo", async () => {
    const tmpData = await mkdtemp(path.join(os.tmpdir(), "founderive-data-"));
    try {
      const deny = await deniedBy(tmpData);
      for (const rule of [`Edit(/${tmpRepo}/web/**)`, `Edit(/${tmpRepo}/founder-data/**)`, `Edit(/${tmpRepo}/.claude/**)`, `Edit(/${tmpRepo}/LICENSE)`, `Edit(/${tmpRepo}/founderive.local.json)`, `Edit(/${tmpRepo}/**)`]) {
        expect(deny).toContain(rule);
      }
      expect(deny).toContain("Bash(git push *)");
    } finally {
      await rm(tmpData, { recursive: true, force: true });
    }
  });

  it("spares only <repo>/founder-data, and denies founderive.local.json, LICENSE as a file, and web/**", async () => {
    const deny = await deniedBy(path.join(tmpRepo, "founder-data"));
    expect(deny).toContain(`Edit(/${tmpRepo}/web/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/.claude/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/LICENSE)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/founderive.local.json)`);
    expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
    expect(deny).not.toContain(`Edit(/${tmpRepo}/**)`);
  });

  it("handles a nested data folder level by level", async () => {
    await mkdir(path.join(tmpRepo, "lab", "founder-data"), { recursive: true });
    await writeFile(path.join(tmpRepo, "lab", "notes.txt"), "");
    const deny = await deniedBy(path.join(tmpRepo, "lab", "founder-data"));
    expect(deny).toContain(`Edit(/${tmpRepo}/web/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/founder-data/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/founderive.local.json)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/lab/notes.txt)`);
    expect(deny.some((d) => d.startsWith(`Edit(/${tmpRepo}/lab/founder-data`) || d === `Edit(/${tmpRepo}/lab/**)`)).toBe(false);
  });

  it("<repo>/web/founder-data is refused, so nothing in the repo is spared and web/src/** stays denied", async () => {
    await mkdir(path.join(tmpRepo, "web", "founder-data"));
    expect(dataFolderIsSafe(tmpRepo, path.join(tmpRepo, "web", "founder-data"))).toBe(false);
    const deny = await deniedBy(path.join(tmpRepo, "web", "founder-data"));
    expect(deny).toContain(`Edit(/${tmpRepo}/web/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/**)`);
  });

  it("denies a nested folder's siblings at each level: every top-level entry but web, every entry of web/ but founder-data", async () => {
    // dataFolderIsSafe refuses web/, so this exercises the level-by-level rules directly.
    await mkdir(path.join(tmpRepo, "web", "founder-data"));
    const deny = denyRules(tmpRepo, [
      { dir: tmpRepo, keep: "web", entries: [{ name: "web", isDirectory: true }, { name: "LICENSE", isDirectory: false }, { name: "founderive.local.json", isDirectory: false }] },
      { dir: path.join(tmpRepo, "web"), keep: "founder-data", entries: [{ name: "src", isDirectory: true }, { name: "founder-data", isDirectory: true }, { name: "package.json", isDirectory: false }] },
    ]);
    expect(deny).toContain(`Edit(/${tmpRepo}/LICENSE)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/founderive.local.json)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/web/src/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/web/package.json)`);
    expect(deny).not.toContain(`Edit(/${tmpRepo}/web/**)`);
    expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
  });

  it("spares nothing when the data folder is the repo itself", async () => {
    expect(dataFolderIsSafe(tmpRepo, tmpRepo)).toBe(false);
    const deny = await deniedBy(tmpRepo);
    expect(deny).toContain(`Edit(/${tmpRepo}/**)`);
    expect(deny).toContain(`Edit(/${tmpRepo}/founder-data/**)`);
  });

  it("denies the settings folder itself", async () => {
    const file = await writeLaunchSettings(tmpRepo, null);
    const deny = JSON.parse(await readFile(file, "utf8")).permissions.deny as string[];
    expect(deny).toContain(`Edit(/${path.dirname(file)}/**)`);
  });

  it("removeLaunchSettings deletes the file writeLaunchSettings wrote", async () => {
    const tmpRepo = await mkdtemp(path.join(os.tmpdir(), "founderive-test-"));
    try {
      const file = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
      expect(existsSync(file)).toBe(true);
      await removeLaunchSettings();
      expect(existsSync(file)).toBe(false);
    } finally {
      await rm(tmpRepo, { recursive: true, force: true });
    }
  });

  it("recreates its settings folder if something (e.g. macOS) cleaned it out from under a long-running process", async () => {
    const tmpRepo = await mkdtemp(path.join(os.tmpdir(), "founderive-test-"));
    try {
      const file = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
      await rm(path.dirname(file), { recursive: true, force: true });
      expect(existsSync(file)).toBe(false);
      const file2 = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
      expect(existsSync(file2)).toBe(true);
    } finally {
      await rm(tmpRepo, { recursive: true, force: true });
    }
  });
});

describe("claudeArgs", () => {
  const settings = "/tmp/x/claude-settings.json";
  it("adds the repo as a directory and the settings file when home is the record", () => {
    expect(claudeArgs({ cwd: "/d", mode: "record", name: "d", data: "/d" }, "/r/app", settings)).toEqual(["--add-dir", "/r/app", "--settings", settings]);
  });
  it("adds only the settings file when home is the repo", () => {
    expect(claudeArgs({ cwd: "/r/app", mode: "repo", name: "app", data: null }, "/r/app", settings)).toEqual(["--settings", settings]);
  });
});

describe("shellQuote", () => {
  it("single-quotes and escapes embedded quotes", () => {
    expect(shellQuote("/Users/sam/My Venture")).toBe("'/Users/sam/My Venture'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});
