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
    expect(text.split("\n").slice(0, 6)).toEqual([
      "Today: 2026-10-13 (week 2026-W42, starts 2026-10-12)",
      "Outcome: Talk to five agency owners about scheduling",
      "30-day outcome: Three agencies agree to a paid pilot",
      "Next action: Email the two agencies from the meetup",
      "  Why: Overdue since 2026-10-12.",
      "  id: commitment:c-1",
    ]);
    expect(text).toContain("  Email the two agencies from the meetup · due 2026-10-12 (overdue) (id c-1)");
    expect(text).toContain("Done this week:");
    expect(text).toContain("  Draft interview questions (id c-2)");
    expect(text).not.toContain("Dropped this week:");
    expect(text).toContain("Blocker: none");
    expect(text).toContain("Files to fix: program/week-02.md, program/week-03.md");
  });
  it("omits the 30-day outcome line when founder.md doesn't have one", async () => {
    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace(/^outcome30:.*$/m, ""));
    expect(formatToday(await loadToday())).not.toContain("30-day outcome:");
  });
  it("lists only open commitments under Commitments:, with due-today, overdue and future markers", async () => {
    const file = path.join(env.dir, "checkins/2026-W42.md");
    await writeFile(
      file,
      (await readFile(file, "utf8")).replace(
        "commitments:\n  - id: c-1\n    text: Email the two agencies from the meetup\n    due: 2026-10-12\n    status: open\n  - id: c-2\n    text: Draft interview questions\n    status: done",
        [
          "commitments:",
          "  - id: c-1",
          "    text: Email the two agencies from the meetup",
          "    due: 2026-10-12",
          "    status: open",
          "  - id: c-2",
          "    text: Draft interview questions",
          "    status: done",
          "  - id: c-3",
          "    text: Call the pilot lead",
          "    due: 2026-10-13",
          "    status: open",
          "  - id: c-4",
          "    text: Send the follow-up deck",
          "    due: 2026-10-20",
          "    status: open",
          "  - id: c-5",
          "    text: Interview a sixth agency",
          "    status: dropped",
          "    reason: Couldn't reach anyone new this week",
        ].join("\n"),
      ),
    );
    const text = formatToday(await loadToday());
    const lines = text.split("\n");
    const commitmentsIdx = lines.indexOf("Commitments:");
    const doneIdx = lines.indexOf("Done this week:");
    const droppedIdx = lines.indexOf("Dropped this week:");
    expect(commitmentsIdx).toBeGreaterThan(-1);
    expect(doneIdx).toBeGreaterThan(commitmentsIdx);
    expect(droppedIdx).toBeGreaterThan(doneIdx);
    const commitmentLines = lines.slice(commitmentsIdx + 1, doneIdx);
    expect(commitmentLines).toEqual([
      "  Email the two agencies from the meetup · due 2026-10-12 (overdue) (id c-1)",
      "  Call the pilot lead · due today (id c-3)",
      "  Send the follow-up deck · due 2026-10-20 (id c-4)",
    ]);
    expect(lines.slice(doneIdx + 1, droppedIdx)).toEqual(["  Draft interview questions (id c-2)"]);
    expect(lines.slice(droppedIdx + 1, droppedIdx + 2)).toEqual(["  Interview a sixth agency — Couldn't reach anyone new this week (id c-5)"]);
  });
  it("omits Done this week and Dropped this week when there are none", async () => {
    const file = path.join(env.dir, "checkins/2026-W42.md");
    await writeFile(
      file,
      (await readFile(file, "utf8")).replace(
        "  - id: c-2\n    text: Draft interview questions\n    status: done",
        "",
      ),
    );
    const text = formatToday(await loadToday());
    expect(text).not.toContain("Done this week:");
    expect(text).not.toContain("Dropped this week:");
  });
  it("says when setup isn't finished", async () => {
    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("setupComplete: true", "setupComplete: false"));
    expect(formatToday(await loadToday())).toMatch(/^Setup isn't finished/);
  });
});
