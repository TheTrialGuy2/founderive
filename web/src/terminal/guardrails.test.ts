import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { claudeArgs, claudeSettings, panelHome, shellQuote, writeLaunchSettings } from "./guardrails";

describe("panelHome", () => {
  it("is the data folder once setup is complete", () => {
    expect(panelHome({ repo: "/r/app", data: "/Users/sam/Founderive/Lantern", setupComplete: true })).toEqual({ cwd: "/Users/sam/Founderive/Lantern", mode: "record", name: "Lantern" });
  });
  it("is the repo before setup, or when there is no data folder", () => {
    expect(panelHome({ repo: "/r/app", data: "/r/app/founder-data", setupComplete: false })).toEqual({ cwd: "/r/app", mode: "repo", name: "app" });
    expect(panelHome({ repo: "/r/app", data: null, setupComplete: false })).toEqual({ cwd: "/r/app", mode: "repo", name: "app" });
  });
});

describe("claudeSettings", () => {
  it("denies edits to each app entry with an absolute // path, keeps the data folder, and denies git push", () => {
    const json = JSON.parse(claudeSettings("/r/app", ["web", "docs", ".claude", "founder-data", "AGENTS.md", "start.mjs", "founderive.local.json"], ["founder-data", "founderive.local.json"]));
    expect(json.permissions.deny).toEqual(["Edit(//r/app/web/**)", "Edit(//r/app/docs/**)", "Edit(//r/app/.claude/**)", "Edit(//r/app/AGENTS.md)", "Edit(//r/app/start.mjs)", "Bash(git push *)", "Bash(git push:*)"]);
  });
  it("treats an entry with a dot in its name as a file and the rest as folders", () => {
    const json = JSON.parse(claudeSettings("/r/app", ["package.json", "scripts"], []));
    expect(json.permissions.deny.slice(0, 2)).toEqual(["Edit(//r/app/package.json)", "Edit(//r/app/scripts/**)"]);
  });
});

describe("writeLaunchSettings", () => {
  it("writes the settings for the real repo, never covering the data folder when it's inside it", async () => {
    const repo = process.cwd().replace(/\/web$/, "");
    const file = await writeLaunchSettings(repo, `${repo}/founder-data`);
    const json = JSON.parse(await readFile(file, "utf8"));
    const deny: string[] = json.permissions.deny;
    expect(deny).toContain(`Edit(/${repo}/web/**)`);
    expect(deny.some((d) => d.includes("founder-data"))).toBe(false);
    expect(deny.some((d) => d.includes("founderive.local.json"))).toBe(false);
    expect(deny).toContain("Bash(git push *)");
  });
});

describe("claudeArgs", () => {
  const settings = "/tmp/x/claude-settings.json";
  it("adds the repo as a directory and the settings file when home is the record", () => {
    expect(claudeArgs({ cwd: "/d", mode: "record", name: "d" }, "/r/app", settings)).toEqual(["--add-dir", "/r/app", "--settings", settings]);
  });
  it("adds only the settings file when home is the repo", () => {
    expect(claudeArgs({ cwd: "/r/app", mode: "repo", name: "app" }, "/r/app", settings)).toEqual(["--settings", settings]);
  });
});

describe("shellQuote", () => {
  it("single-quotes and escapes embedded quotes", () => {
    expect(shellQuote("/Users/sam/My Venture")).toBe("'/Users/sam/My Venture'");
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});
