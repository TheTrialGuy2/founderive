import { writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listEntries, readEntry } from "./read";
import { kindOf } from "./schemas";
import { useTempData } from "./test-helpers";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("kindOf", () => {
  it("maps paths to kinds", () => {
    expect(kindOf("founder.md")).toBe("founder");
    expect(kindOf("program/week-01.md")).toBe("week");
    expect(kindOf("checkins/2026-W42.md")).toBe("checkin");
    expect(kindOf("notes/scratch.md")).toBeNull();
  });
});

describe("readEntry", () => {
  it("reads and validates a file, applying defaults", async () => {
    const e = await readEntry("founder", "founder.md");
    expect(e?.ok && e.data).toMatchObject({ name: "Sam Rivera", venture: "Lantern", programWeeks: 10 });
  });
  it("returns null for a missing file", async () => {
    expect(await readEntry("week", "program/week-07.md")).toBeNull();
  });
  it("flags a schema error with the field name", async () => {
    const e = await readEntry("week", "program/week-02.md");
    expect(e?.ok).toBe(false);
    expect(!e?.ok && e?.error).toMatch(/status/);
  });
  it("flags bad YAML", async () => {
    const e = await readEntry("week", "program/week-03.md");
    expect(!e?.ok && e?.error).toMatch(/^YAML:/);
  });
  it("keeps the body", async () => {
    const e = await readEntry("week", "program/week-01.md");
    expect(e?.ok && e.body.trim()).toBe("Notes from the first session.");
  });
  it("flags a path that doesn't match the kind, without reading the file", async () => {
    const e = await readEntry("week", "notes/scratch.md");
    expect(e).toEqual({ ok: false, kind: "week", path: "notes/scratch.md", error: "notes/scratch.md is not a valid path for week" });
  });
  it("flags an undeclared key instead of keeping it", async () => {
    await writeFile(path.join(env.dir, "program/week-04.md"), "---\nweek: 4\ntitle: x\ntitel: typo\n---\n");
    const e = await readEntry("week", "program/week-04.md");
    expect(e?.ok).toBe(false);
    expect(!e?.ok && e?.error).toMatch(/titel/);
  });
  it("reads a check-in with defaults", async () => {
    const e = await readEntry("checkin", "checkins/2026-W42.md");
    expect(e?.ok && e.data.commitments).toHaveLength(2);
    expect(e?.ok && e.data.nextStepLog).toEqual([]);
  });
  it("rejects a founder stage typo", async () => {
    await writeFile(path.join(env.dir, "founder.md"), "---\nname: A\nstage: validatng\n---\n");
    const e = await readEntry("founder", "founder.md");
    expect(!e?.ok && e?.error).toMatch(/stage/);
  });
  it("accepts the founder profile essentials and checks the start month", async () => {
    const ok = await readEntry("founder", "founder.md");
    expect(ok?.ok && ok.data).toMatchObject({ city: "Charlotte", region: "NC", commitment: "part-time", cofounders: "solo", industry: "Home healthcare", startedOn: "2026-03" });
    await writeFile(path.join(env.dir, "founder.md"), "---\nname: A\nstartedOn: 2026-3\n---\n");
    const bad = await readEntry("founder", "founder.md");
    expect(!bad?.ok && bad?.error).toMatch(/startedOn/);
  });
});

describe("listEntries", () => {
  it("lists every file of a kind, sorted, skipping _archive", async () => {
    const all = await listEntries("week");
    expect(all.map((e) => e.path)).toEqual(["program/week-01.md", "program/week-02.md", "program/week-03.md"]);
  });
});
