import { describe, expect, it } from "vitest";
import { applyBlockSave, canvasBlocks, confirmImport, DEFAULT_CANVAS } from "./canvas";

describe("default canvas", () => {
  it("ships nine generic blocks, each with a title and prompt in our own words", () => {
    expect(DEFAULT_CANVAS.map((b) => b.id)).toEqual(["customer", "problem", "solution", "alternatives", "advantage", "channel", "revenue", "cost", "feasibility"]);
    for (const b of DEFAULT_CANVAS) expect(b.title && b.prompt).toBeTruthy();
  });
  it("a founder's own list replaces it", () => {
    const own = [{ id: "partners", title: "Key partners", prompt: "Who helps you deliver?" }];
    expect(canvasBlocks({ blocks: own })).toEqual(own);
    expect(canvasBlocks(null)).toBe(DEFAULT_CANVAS);
  });
});

describe("applyBlockSave", () => {
  it("starts a new block", () => {
    expect(applyBlockSave(null, "customer", { text: "Agency owners", status: "untested" }, "2026-10-13")).toEqual({
      id: "customer",
      text: "Agency owners",
      status: "untested",
      updated: "2026-10-13",
      history: [],
    });
  });
  it("keeps the previous wording and its date when the text changes", () => {
    const first = applyBlockSave(null, "customer", { text: "Agency owners", status: "untested" }, "2026-10-01");
    const second = applyBlockSave(first, "customer", { text: "Owners of agencies with 10-50 caregivers", status: "some-evidence" }, "2026-10-13");
    expect(second).toMatchObject({ text: "Owners of agencies with 10-50 caregivers", status: "some-evidence", updated: "2026-10-13" });
    expect(second.history).toEqual([{ date: "2026-10-01", text: "Agency owners" }]);
  });
  it("a status-only change adds no history", () => {
    const first = applyBlockSave(null, "customer", { text: "Agency owners", status: "untested" }, "2026-10-01");
    expect(applyBlockSave(first, "customer", { text: "Agency owners", status: "tested" }, "2026-10-13").history).toEqual([]);
  });
  it("the founder's save clears the imported mark, as does confirming", () => {
    const seeded = { id: "customer", text: "Imported text", status: "untested" as const, history: [], seeded: true, source: "import" };
    expect(applyBlockSave(seeded, "customer", { text: "Imported text", status: "untested" }, "2026-10-13")).not.toHaveProperty("seeded");
    expect(confirmImport(seeded)).toEqual({ id: "customer", text: "Imported text", status: "untested", history: [], source: "import" });
  });
});
