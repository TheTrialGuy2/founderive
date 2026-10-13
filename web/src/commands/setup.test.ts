import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";
import { firstIncompleteStep, parseSetupStep, saveSetupStep } from "./setup";

const STARTER = fileURLToPath(new URL("../../../starter-data", import.meta.url));
const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) for (const vv of v) fd.append(k, vv);
    else fd.set(k, v);
  }
  return fd;
};
const STEP_FORMS: Record<number, Record<string, string>> = {
  1: { name: "Sam", city: "Charlotte", region: "NC", commitment: "part-time", cofounders: "solo" },
  2: { venture: "Lantern", oneLiner: "Scheduling for home-care agencies", website: "", industry: "Home healthcare", businessModel: "software", startedOn: "2026-03" },
  3: { stage: "idea", evidence: "none" },
  4: { targetCustomer: "Agency owners", problem: "Schedules are rebuilt by hand", outcome30: "Ten conversations", hoursPerWeek: "12" },
};

describe("parseSetupStep", () => {
  it("accepts each complete step", () => {
    for (const step of [1, 2, 3, 4]) expect(parseSetupStep(step, form(STEP_FORMS[step])).ok).toBe(true);
  });
  it("step 2 allows 'still working on it' and an empty website", () => {
    const r = parseSetupStep(2, form({ ...STEP_FORMS[2], oneLiner: "", stillWorking: "on" }));
    expect(r.ok && r.patch).toMatchObject({ oneLiner: null, website: null, startedOn: "2026-03" });
  });
  it("returns field errors and keeps what was typed", () => {
    const r = parseSetupStep(1, form({ ...STEP_FORMS[1], name: "", commitment: "sometimes" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["commitment", "name"]);
      expect(r.values.city).toBe("Charlotte");
    }
  });
  it("checks the start month and hours", () => {
    expect(!parseSetupStep(2, form({ ...STEP_FORMS[2], startedOn: "March" })).ok).toBe(true);
    expect(!parseSetupStep(4, form({ ...STEP_FORMS[4], hoursPerWeek: "200" })).ok).toBe(true);
  });
  it("normalizes the start month from common typed forms", () => {
    const started = (startedOn: string) => {
      const r = parseSetupStep(2, form({ ...STEP_FORMS[2], startedOn }));
      return r.ok ? r.patch.startedOn : r.errors.startedOn;
    };
    for (const typed of ["2026-03", "2026-3", "03/2026", "3/2026", "March 2026", "Mar 2026", "march 2026", " MARCH 2026 "]) expect(started(typed)).toBe("2026-03");
    expect(started("12/2025")).toBe("2025-12");
    expect(started("Sept 2026")).toBe("2026-09");
  });
  it("explains an unreadable start month", () => {
    for (const typed of ["", "March", "2026-13", "13/2026", "0/2026", "Marchh 2026", "2026/03/01"]) {
      const r = parseSetupStep(2, form({ ...STEP_FORMS[2], startedOn: typed }));
      expect(!r.ok && r.errors.startedOn).toBe("Pick the month you started (for example 2026-03).");
    }
  });
  it("requires a real US state code for region", () => {
    expect(parseSetupStep(1, form({ ...STEP_FORMS[1], region: "NC" })).ok).toBe(true);
    const bad = parseSetupStep(1, form({ ...STEP_FORMS[1], region: "Carolina" }));
    expect(!bad.ok && bad.errors.region).toBe("Pick your state.");
    const empty = parseSetupStep(1, form({ ...STEP_FORMS[1], region: "" }));
    expect(!empty.ok && empty.errors.region).toBe("Pick your state.");
  });
  it("keeps co-founder names by cofounders count, dropping empties and keeping order", () => {
    const two = parseSetupStep(1, form({ ...STEP_FORMS[1], cofounders: "two", cofounderName: ["Jordan", "Spare"] }));
    expect(two.ok && two.patch.cofounderNames).toEqual(["Jordan"]);

    const three = parseSetupStep(1, form({ ...STEP_FORMS[1], cofounders: "three-plus", cofounderName: ["Jordan", "", "Alex"] }));
    expect(three.ok && three.patch.cofounderNames).toEqual(["Jordan", "Alex"]);

    const solo = parseSetupStep(1, form({ ...STEP_FORMS[1], cofounders: "solo", cofounderName: ["Jordan"] }));
    expect(solo.ok && solo.patch.cofounderNames).toEqual([]);
  });
  it("requires program details only when in a program", () => {
    const r = parseSetupStep(4, form({ ...STEP_FORMS[4], inProgram: "on", programTitle: "", programStart: "", programWeeks: "0" }));
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["programStart", "programTitle", "programWeeks"]);
    const none = parseSetupStep(4, form(STEP_FORMS[4]));
    expect(none.ok && none.patch).toMatchObject({ programTitle: null, programStart: null, programWeeks: null });
  });
});

describe("firstIncompleteStep", () => {
  it("walks the steps in order and is null once setup is complete", () => {
    expect(firstIncompleteStep(null)).toBe(1);
    expect(firstIncompleteStep({ name: "A", venture: "B", setupComplete: false })).toBe(1);
    const afterOne = { name: "A", venture: "", city: "C", region: "NC", commitment: "part-time" as const, cofounders: "solo" as const, setupComplete: false };
    expect(firstIncompleteStep(afterOne)).toBe(2);
    expect(firstIncompleteStep({ ...afterOne, venture: "B", industry: "X", businessModel: "service", startedOn: "2026-01" })).toBe(3);
    expect(firstIncompleteStep({ name: "A", venture: "B", setupComplete: true })).toBeNull();
  });
});

describe("saveSetupStep", () => {
  let env: Awaited<ReturnType<typeof useTempData>>;
  beforeEach(async () => {
    env = await useTempData(false);
    process.env.FOUNDER_STARTER_DIR = STARTER;
  });
  afterEach(async () => {
    delete process.env.FOUNDER_STARTER_DIR;
    await env.cleanup();
  });
  const patch = (step: number) => {
    const r = parseSetupStep(step, form(STEP_FORMS[step]));
    if (!r.ok) throw new Error("fixture invalid");
    return r.patch;
  };

  it("creates founder-data on the first step and saves as you go", async () => {
    await saveSetupStep(1, patch(1));
    let f = await readEntry("founder", "founder.md");
    expect(f?.ok && f.data).toMatchObject({ name: "Sam", city: "Charlotte", setupComplete: false });
    await saveSetupStep(2, patch(2));
    f = await readEntry("founder", "founder.md");
    expect(f?.ok && f.data).toMatchObject({ name: "Sam", venture: "Lantern", industry: "Home healthcare", setupComplete: false });
  });
  it("the last step completes setup and creates blank program weeks without overwriting", async () => {
    for (const step of [1, 2, 3]) await saveSetupStep(step, patch(step));
    const withProgram = parseSetupStep(4, form({ ...STEP_FORMS[4], inProgram: "on", programTitle: "Spring Cohort", programStart: "2026-09-15", programWeeks: "3" }));
    if (!withProgram.ok) throw new Error("fixture invalid");
    await saveSetupStep(4, withProgram.patch);
    const f = await readEntry("founder", "founder.md");
    expect(f?.ok && f.data).toMatchObject({ setupComplete: true, programTitle: "Spring Cohort", programWeeks: 3 });
    expect((await readdir(path.join(env.dir, "program"))).sort()).toEqual(["week-01.md", "week-02.md", "week-03.md"]);
    await saveSetupStep(4, withProgram.patch);
    const w = await readEntry("week", "program/week-02.md");
    expect(w?.ok && w.data.title).toBe("Week 2");
  });
  it("editing an early step later keeps setup complete", async () => {
    for (const step of [1, 2, 3, 4]) await saveSetupStep(step, patch(step));
    await saveSetupStep(1, { ...patch(1), city: "Raleigh" });
    const f = await readEntry("founder", "founder.md");
    expect(f?.ok && f.data).toMatchObject({ city: "Raleigh", setupComplete: true });
  });
  it("reports whether setup was already complete before this save", async () => {
    expect((await saveSetupStep(1, patch(1))).wasComplete).toBe(false);
    expect((await saveSetupStep(2, patch(2))).wasComplete).toBe(false);
    expect((await saveSetupStep(3, patch(3))).wasComplete).toBe(false);
    expect((await saveSetupStep(4, patch(4))).wasComplete).toBe(false);
    expect((await saveSetupStep(1, { ...patch(1), city: "Raleigh" })).wasComplete).toBe(true);
  });
});
