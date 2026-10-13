import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { kindOf } from "../store/schemas";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { parseFeedbackForm, saveFeedback } from "./feedback";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
});
afterEach(() => env.cleanup());

describe("feedback", () => {
  it("needs what happened and keeps the rest", () => {
    const fd = new FormData();
    fd.set("whatHappened", " ");
    fd.set("page", "/today");
    const r = parseFeedbackForm(fd);
    expect(!r.ok && r.errors.whatHappened).toBeTruthy();
    expect(r.values.page).toBe("/today");
  });
  it("saves a local copy in founder-data/feedback", async () => {
    const rel = await saveFeedback({ whatHappened: "Saving a test showed an error", page: "/tests/new", expected: null }, "2026-10-13", "0.1.0");
    expect(rel).toBe("feedback/2026-10-13-saving-a-test-showed-an-error.md");
    expect(kindOf(rel)).toBe("feedback");
    const e = await readEntry("feedback", rel);
    expect(e?.ok && e.data).toMatchObject({ date: "2026-10-13", page: "/tests/new", whatHappened: "Saving a test showed an error", appVersion: "0.1.0" });
  });
  it("reduces a pasted app path to its route pattern before anything is sent or saved", () => {
    const fd = new FormData();
    fd.set("whatHappened", "The page broke");
    fd.set("page", "/tests/2026-10-06-paid-pilot");
    const r = parseFeedbackForm(fd);
    expect(r.ok && r.input.page).toBe("/tests/…");
  });
});
