import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { loadToday } from "./today";
import { formatToday } from "./today-text";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
});
afterEach(() => env.cleanup());

describe("formatToday", () => {
  it("prints Today in the app's order, with the ids an agent needs", async () => {
    const text = formatToday(await loadToday());
    expect(text.split("\n").slice(0, 5)).toEqual([
      "Today: 2026-10-13 (week 2026-W42, starts 2026-10-12)",
      "Outcome: Talk to five agency owners about scheduling",
      "Next action: Email the two agencies from the meetup",
      "  Why: Overdue since 2026-10-12.",
      "  id: commitment:c-1",
    ]);
    expect(text).toContain("  [open] Email the two agencies from the meetup · due 2026-10-12 (overdue) (id c-1)");
    expect(text).toContain("  [done] Draft interview questions (id c-2)");
    expect(text).toContain("Blocker: none");
    expect(text).toContain("Files to fix: program/week-02.md, program/week-03.md");
  });
  it("says when setup isn't finished", async () => {
    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("setupComplete: true", "setupComplete: false"));
    expect(formatToday(await loadToday())).toMatch(/^Setup isn't finished/);
  });
});
