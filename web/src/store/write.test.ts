import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { OutsideDataDirError } from "./paths";
import { readEntry } from "./read";
import { useTempData } from "./test-helpers";
import { archiveEntry, saveEntry, ValidationError, writeFileAtomic } from "./write";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

const exists = (p: string) => access(p).then(() => true, () => false);

describe("writeFileAtomic", () => {
  it("creates folders and leaves no temp files", async () => {
    await writeFileAtomic("pitch/message/2026-10-13.md", "hello");
    const dir = path.join(env.dir, "pitch/message");
    expect(await readFile(path.join(dir, "2026-10-13.md"), "utf8")).toBe("hello");
    expect(await readdir(dir)).toEqual(["2026-10-13.md"]);
  });
  it("refuses paths outside founder-data", async () => {
    await expect(writeFileAtomic("../escape.md", "x")).rejects.toThrow(OutsideDataDirError);
  });
});

describe("saveEntry", () => {
  it("writes a valid entry that reads back the same", async () => {
    await saveEntry("week", "program/week-04.md", { week: 4, title: "Building the relationship", status: "in-progress", exercises: [], homework: [] }, "Notes\n");
    const e = await readEntry("week", "program/week-04.md");
    expect(e?.ok && e.data).toMatchObject({ week: 4, status: "in-progress" });
    expect(e?.ok && e.body).toBe("Notes\n");
  });
  it("rejects invalid data and writes nothing", async () => {
    const bad = { week: 4, title: "x", status: "maybe" } as never;
    await expect(saveEntry("week", "program/week-04.md", bad)).rejects.toThrow(ValidationError);
    expect(await exists(path.join(env.dir, "program/week-04.md"))).toBe(false);
  });
  it("rejects a path that doesn't match the kind", async () => {
    await expect(saveEntry("week", "notes/week.md", { week: 1, title: "x", status: "done", exercises: [], homework: [] })).rejects.toThrow(ValidationError);
  });
  it("keeps declared metadata (seeded, source, concepts, extensions) through a save", async () => {
    await saveEntry("week", "program/week-04.md", {
      week: 4,
      title: "Week 4",
      status: "not-started",
      exercises: [{ id: "ex-1", title: "Canvas", seeded: true, concepts: ["a"] }],
      homework: [{ id: "hw-1", title: "Interviews", status: "open", seeded: true, concepts: ["a"] }],
      seeded: true,
      source: "import",
      concepts: ["a"],
      extensions: { color: "teal" },
    });
    const e = await readEntry("week", "program/week-04.md");
    expect(e?.ok && e.data).toMatchObject({ seeded: true, source: "import", concepts: ["a"], extensions: { color: "teal" } });
    expect(e?.ok && e.data.homework[0]).toMatchObject({ seeded: true, concepts: ["a"] });
  });
  it("rejects an undeclared core key on save", async () => {
    const bad = { week: 4, title: "x", status: "not-started", exercises: [], homework: [], titel: "typo" } as never;
    await expect(saveEntry("week", "program/week-04.md", bad)).rejects.toThrow(ValidationError);
  });
});

describe("archiveEntry", () => {
  it("moves the file under _archive with its original path", async () => {
    const target = await archiveEntry("program/week-01.md");
    expect(target).toBe("_archive/program/week-01.md");
    expect(await exists(path.join(env.dir, "program/week-01.md"))).toBe(false);
    expect(await exists(path.join(env.dir, target))).toBe(true);
  });
  it("never overwrites an earlier archived copy", async () => {
    await archiveEntry("program/week-01.md");
    await writeFile(path.join(env.dir, "program/week-01.md"), "---\nweek: 1\ntitle: again\n---\n");
    const second = await archiveEntry("program/week-01.md");
    expect(second).toMatch(/^_archive\/program\/week-01\.\d{4}-.+\.md$/);
  });
  it("keeps every archived copy across repeated archives", async () => {
    const targets: string[] = [];
    for (let i = 0; i < 3; i++) {
      await writeFile(path.join(env.dir, "program/week-01.md"), `---\nweek: 1\ntitle: v${i}\n---\n`);
      targets.push(await archiveEntry("program/week-01.md"));
    }
    expect(new Set(targets).size).toBe(3);
    for (const t of targets) expect(await exists(path.join(env.dir, t))).toBe(true);
  });
  it("preserves pre-existing archive when archiving again", async () => {
    await writeFile(path.join(env.dir, "_archive/program/week-01.md"), "OLD");
    await writeFile(path.join(env.dir, "program/week-01.md"), "---\nweek: 1\ntitle: new\n---\n");
    await archiveEntry("program/week-01.md");
    const oldContent = await readFile(path.join(env.dir, "_archive/program/week-01.md"), "utf8");
    expect(oldContent).toBe("OLD");
  });
});
