import { writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { confirmImportedRecord } from "./import";
import { loadProgram, markSessionHeld } from "./program";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("program weeks", () => {
  it("uses the calendar for program position, regardless of week statuses", async () => {
    const program = await loadProgram();
    expect(program.status === "ready" && program.current).toBe(5);
  });

  it("marks an empty session held with its date and optional note", async () => {
    await writeFile(path.join(env.dir, "program/week-02.md"), "---\nweek: 2\ntitle: Session 2\nstatus: not-started\nexercises: []\nhomework: []\n---\n");
    await markSessionHeld(2, "2026-09-22", "Guest speaker session");
    const entry = await readEntry("week", "program/week-02.md");
    expect(entry?.ok && entry.data).toMatchObject({ status: "done", date: "2026-09-22", exercises: [], homework: [] });
    expect(entry?.ok && entry.body.trim()).toBe("Guest speaker session");
  });

  it("confirms an imported week by clearing seeded and keeping source and contents", async () => {
    await writeFile(path.join(env.dir, "program/week-02.md"), "---\nweek: 2\ntitle: Session 2\nstatus: done\nseeded: true\nsource: program deck\nexercises:\n  - { id: ex-1, title: Map the customer }\nhomework: []\n---\nNotes\n");
    await confirmImportedRecord("program/week-02.md");
    const entry = await readEntry("week", "program/week-02.md");
    expect(entry?.ok && entry.data.seeded).toBeUndefined();
    expect(entry?.ok && entry.data.source).toBe("program deck");
    expect(entry?.ok && entry.data.exercises[0].title).toBe("Map the customer");
  });
});
