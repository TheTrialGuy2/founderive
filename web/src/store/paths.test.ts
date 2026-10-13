import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dataDir, OutsideDataDirError, resolveInData } from "./paths";
import { useTempData } from "./test-helpers";

/** Puts an env var back exactly as it was (assigning undefined would store the string "undefined"). */
function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("resolveInData", () => {
  let env: Awaited<ReturnType<typeof useTempData>>;
  beforeEach(async () => (env = await useTempData(false)));
  afterEach(() => env.cleanup());

  it("uses FOUNDER_DATA_DIR", () => {
    expect(dataDir()).toBe(path.resolve(env.dir));
  });
  it("resolves paths inside the data dir", () => {
    expect(resolveInData("program/week-01.md")).toBe(path.join(env.dir, "program/week-01.md"));
  });
  it.each(["../escape.md", "a/../../escape.md", "/etc/passwd"])("rejects %s", (rel) => {
    expect(() => resolveInData(rel)).toThrow(OutsideDataDirError);
  });
});

describe("dataDir resolution order", () => {
  let tmp: string;
  let previousDataDir: string | undefined;
  let previousConfig: string | undefined;
  let previousVitest: string | undefined;

  // These cases check the app's own resolution order, so they switch the test-runner guard off and back on.
  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "founderive-config-"));
    previousDataDir = process.env.FOUNDER_DATA_DIR;
    previousConfig = process.env.FOUNDERIVE_LOCAL_CONFIG;
    previousVitest = process.env.VITEST;
    delete process.env.FOUNDER_DATA_DIR;
    delete process.env.VITEST;
  });

  afterEach(() => {
    restoreEnv("VITEST", previousVitest);
    if (previousDataDir === undefined) delete process.env.FOUNDER_DATA_DIR;
    else process.env.FOUNDER_DATA_DIR = previousDataDir;
    if (previousConfig === undefined) delete process.env.FOUNDERIVE_LOCAL_CONFIG;
    else process.env.FOUNDERIVE_LOCAL_CONFIG = previousConfig;
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeConfig(contents: string): string {
    const configPath = path.join(tmp, "founderive.local.json");
    writeFileSync(configPath, contents);
    process.env.FOUNDERIVE_LOCAL_CONFIG = configPath;
    return configPath;
  }

  it("falls back to the repo-root default when there is no config file", () => {
    process.env.FOUNDERIVE_LOCAL_CONFIG = path.join(tmp, "missing.json");
    const repoRoot = path.resolve(process.cwd(), "..");
    expect(dataDir()).toBe(path.resolve(repoRoot, "founder-data"));
  });

  it("uses the configured dataDir when present", () => {
    const target = path.join(tmp, "my-data");
    writeConfig(JSON.stringify({ dataDir: target }));
    expect(dataDir()).toBe(path.resolve(target));
  });

  it("expands ~/ in the configured dataDir", () => {
    writeConfig(JSON.stringify({ dataDir: "~/founderive-test-xyz" }));
    expect(dataDir()).toBe(path.join(os.homedir(), "founderive-test-xyz"));
  });

  it("resolves a relative configured dataDir against the repo root", () => {
    writeConfig(JSON.stringify({ dataDir: "relative-data" }));
    const repoRoot = path.resolve(process.cwd(), "..");
    expect(dataDir()).toBe(path.join(repoRoot, "relative-data"));
  });

  it("prefers FOUNDER_DATA_DIR over the config file", () => {
    writeConfig(JSON.stringify({ dataDir: path.join(tmp, "config-data") }));
    process.env.FOUNDER_DATA_DIR = path.join(tmp, "env-data");
    expect(dataDir()).toBe(path.resolve(tmp, "env-data"));
  });

  it("throws a clear error for invalid JSON", () => {
    writeConfig("{ not json");
    expect(() => dataDir()).toThrow('founderive.local.json is invalid: expected { "dataDir": "/path/to/your/data" }');
  });

  it("throws a clear error when dataDir is missing or not a string", () => {
    writeConfig(JSON.stringify({ dataDir: 42 }));
    expect(() => dataDir()).toThrow('founderive.local.json is invalid: expected { "dataDir": "/path/to/your/data" }');
  });
});

describe("under the test runner", () => {
  let tmp: string;
  let previousDataDir: string | undefined;
  let previousConfig: string | undefined;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(os.tmpdir(), "founderive-guard-"));
    previousDataDir = process.env.FOUNDER_DATA_DIR;
    previousConfig = process.env.FOUNDERIVE_LOCAL_CONFIG;
  });

  afterEach(() => {
    restoreEnv("FOUNDER_DATA_DIR", previousDataDir);
    restoreEnv("FOUNDERIVE_LOCAL_CONFIG", previousConfig);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("runs every test file inside a sandbox, never the founder's folder", () => {
    expect(process.env.VITEST).toBeTruthy();
    expect(path.resolve(process.env.FOUNDER_DATA_DIR ?? "")).toContain(path.resolve(os.tmpdir()));
    expect(existsSync(process.env.FOUNDERIVE_LOCAL_CONFIG ?? "")).toBe(false);
    expect(process.env.FOUNDER_STARTER_DIR).toBeTruthy();
  });

  it("refuses to resolve the data folder when FOUNDER_DATA_DIR is unset", () => {
    delete process.env.FOUNDER_DATA_DIR;
    expect(() => dataDir()).toThrow("Tests must set FOUNDER_DATA_DIR");
  });

  it("never reads founderive.local.json, even a valid one", () => {
    const decoy = path.join(tmp, "decoy-data");
    const configPath = path.join(tmp, "founderive.local.json");
    writeFileSync(configPath, JSON.stringify({ dataDir: decoy }));
    process.env.FOUNDERIVE_LOCAL_CONFIG = configPath;
    delete process.env.FOUNDER_DATA_DIR;
    expect(() => dataDir()).toThrow("Tests must set FOUNDER_DATA_DIR");
    process.env.FOUNDER_DATA_DIR = path.join(tmp, "env-data");
    expect(dataDir()).toBe(path.join(tmp, "env-data"));
  });

  it("useTempData puts the sandbox back after cleanup instead of unsetting it", async () => {
    const sandbox = process.env.FOUNDER_DATA_DIR;
    const env = await useTempData(false);
    expect(process.env.FOUNDER_DATA_DIR).toBe(env.dir);
    await env.cleanup();
    expect(process.env.FOUNDER_DATA_DIR).toBe(sandbox);
    expect(() => dataDir()).not.toThrow();
  });
});
