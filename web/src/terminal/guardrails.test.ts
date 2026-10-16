import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { claudeArgs, claudeSettings, panelHome, removeLaunchSettings, shellQuote, writeLaunchSettings } from "./guardrails";

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

describe("claudeSettings", () => {
  it("denies edits to each app entry with an absolute // path, keeps the data folder, and denies git push", () => {
    const json = JSON.parse(claudeSettings("/r/app", [
      { name: "web", isDirectory: true },
      { name: "docs", isDirectory: true },
      { name: ".claude", isDirectory: true },
      { name: "founder-data", isDirectory: true },
      { name: "AGENTS.md", isDirectory: false },
      { name: "start.mjs", isDirectory: false },
      { name: "founderive.local.json", isDirectory: false },
    ], ["founder-data", "founderive.local.json"]));
    expect(json.permissions.deny).toEqual(["Edit(//r/app/web/**)", "Edit(//r/app/docs/**)", "Edit(//r/app/.claude/**)", "Edit(//r/app/AGENTS.md)", "Edit(//r/app/start.mjs)", "Bash(git push *)", "Bash(git push:*)"]);
  });
  it("distinguishes files from folders by isDirectory, not by name patterns", () => {
    const json = JSON.parse(claudeSettings("/r/app", [
      { name: "LICENSE", isDirectory: false },
      { name: "scripts", isDirectory: true },
    ], []));
    expect(json.permissions.deny.slice(0, 2)).toEqual(["Edit(//r/app/LICENSE)", "Edit(//r/app/scripts/**)"]);
  });
});

describe("writeLaunchSettings", () => {
  it("spares the data folder when it's inside the repo, but not when it's outside", async () => {
    // Create a temp repo with folders and files
    const tmpRepo = await mkdtemp(path.join(os.tmpdir(), "founderive-test-"));
    await mkdir(path.join(tmpRepo, "web"));
    await mkdir(path.join(tmpRepo, "founder-data"));
    await mkdir(path.join(tmpRepo, ".claude"));
    await writeFile(path.join(tmpRepo, "LICENSE"), "");
    await writeFile(path.join(tmpRepo, "founderive.local.json"), "");

    try {
      // Test 1: data folder inside repo should not be denied
      const file1 = await writeLaunchSettings(tmpRepo, path.join(tmpRepo, "founder-data"));
      const json1 = JSON.parse(await readFile(file1, "utf8"));
      const deny1: string[] = json1.permissions.deny;

      // Build expected strings from the same tmpRepo value used in the function (no extra leading slash)
      expect(deny1).toContain(`Edit(/${tmpRepo}/web/**)`);
      expect(deny1).toContain(`Edit(/${tmpRepo}/.claude/**)`);
      expect(deny1).toContain(`Edit(/${tmpRepo}/LICENSE)`);
      expect(deny1.some((d) => d.includes("founder-data"))).toBe(false);
      expect(deny1.some((d) => d.includes("founderive.local.json"))).toBe(false);
      expect(deny1).toContain("Bash(git push *)");

      // Test 2: data folder outside repo should be denied
      const tmpData = await mkdtemp(path.join(os.tmpdir(), "founderive-data-"));
      const file2 = await writeLaunchSettings(tmpRepo, tmpData);
      const json2 = JSON.parse(await readFile(file2, "utf8"));
      const deny2: string[] = json2.permissions.deny;

      // Now founder-data should be denied as a regular folder
      expect(deny2).toContain(`Edit(/${tmpRepo}/founder-data/**)`);
      // But founderive.local.json should still not be denied
      expect(deny2.some((d) => d.includes("founderive.local.json"))).toBe(false);

      await rm(tmpData, { recursive: true, force: true });
    } finally {
      await rm(tmpRepo, { recursive: true, force: true });
    }
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
