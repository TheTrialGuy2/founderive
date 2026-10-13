import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { addCommitment, recordChoice, setOutcome } from "./checkin";
import { loadToday } from "./today";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

async function pinToday(date: string) {
  const file = path.join(env.dir, "founder.md");
  await writeFile(file, (await readFile(file, "utf8")).replace(/^today: .*$/m, `today: ${date}`));
}

describe("loadToday", () => {
  it("ranks this week's work and computes tomorrow on the server", async () => {
    const view = await loadToday();
    expect(view).toMatchObject({ status: "ready", today: "2026-10-13", tomorrow: "2026-10-14", weekId: "2026-W42", weekStartsOn: "2026-10-12" });
    expect(view.status === "ready" && view.next?.id).toBe("commitment:c-1");
  });
  it("flags an impossible pinned today instead of crashing", async () => {
    await pinToday("2026-13-45");
    const view = await loadToday();
    expect(view).toMatchObject({ status: "flagged", path: "founder.md" });
    expect(view.status === "flagged" && view.error).toMatch(/^today: /);
  });
  it("keeps last week's deferral in force until its date", async () => {
    await recordChoice("2026-W42", "2026-10-14", { actionId: "guide:problem-conversations", label: "Talk to five people", choice: "deferred", reason: "Conference week", until: "2026-10-21" });
    await recordChoice("2026-W42", "2026-10-14", { actionId: "fix:program/week-02.md", label: "Fix it", choice: "dismissed", reason: "Later" });
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    const view = await loadToday();
    if (view.status !== "ready") throw new Error(view.status);
    expect(view.guide?.id).toBe("problem-conversations");
    // The deferral (until Wednesday) still hides the guide step this Monday; last week's dismissal no longer applies.
    expect(view.next?.id).toBe("fix:program/week-02.md");
    await pinToday("2026-10-21");
    const later = await loadToday();
    expect(later.status === "ready" && later.next?.id).toBe("guide:problem-conversations");
  });
  it("proposes no new guide step while a guide commitment is open, and seeds facts from evidence", async () => {
    await pinToday("2026-10-19");
    await setOutcome("2026-W43", "Book three demos");
    await addCommitment("2026-W43", { text: "Talk to five people who have the problem", link: "guide:problem-conversations" });
    const view = await loadToday();
    if (view.status !== "ready") throw new Error(view.status);
    expect(view.guide).toBeNull();
    expect(view.next).toMatchObject({ tier: 6, kind: "commitment", reason: "You committed to this step this week." });

    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("evidence: conversations", "evidence: active-users"));
    await mkdir(path.join(env.dir, "checkins"), { recursive: true });
    await writeFile(path.join(env.dir, "checkins/2026-W43.md"), "---\nweek: 2026-W43\noutcome: Book three demos\n---\n");
    const seeded = await loadToday();
    expect(seeded.status === "ready" && seeded.guide?.id).toBe("riskiest-assumption");
  });
  it("sends a founder without setup to setup", async () => {
    const file = path.join(env.dir, "founder.md");
    await writeFile(file, (await readFile(file, "utf8")).replace("setupComplete: true", "setupComplete: false"));
    expect(await loadToday()).toEqual({ status: "setup" });
  });
});
