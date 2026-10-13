import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";
import { setHomeworkStatus } from "./homework";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("setHomeworkStatus", () => {
  it("marks homework done and keeps the week's notes", async () => {
    await setHomeworkStatus(1, "hw-2", "done");
    const w = await readEntry("week", "program/week-01.md");
    expect(w?.ok && w.data.homework.find((h) => h.id === "hw-2")).toMatchObject({ status: "done", skipReason: null });
    expect(w?.ok && w.body.trim()).toBe("Notes from the first session.");
  });
  it("needs a reason to skip; 'not relevant at this stage' is fine", async () => {
    await expect(setHomeworkStatus(1, "hw-1", "skipped")).rejects.toThrow(/why/);
    await setHomeworkStatus(1, "hw-1", "skipped", "Not relevant at this stage");
    const w = await readEntry("week", "program/week-01.md");
    expect(w?.ok && w.data.homework[0]).toMatchObject({ status: "skipped", skipReason: "Not relevant at this stage" });
  });
  it("reports a missing week file", async () => {
    await expect(setHomeworkStatus(7, "hw-1", "done")).rejects.toThrow(/doesn't exist/);
  });
});
