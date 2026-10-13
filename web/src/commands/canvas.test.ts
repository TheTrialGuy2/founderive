import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { useTempData } from "../store/test-helpers";
import { confirmImported, loadCanvas, loadCanvasBlock, saveCanvasBlock } from "./canvas";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  // Start from an empty canvas whatever the fixture holds (Task 14 adds a seeded block).
  await rm(path.join(env.dir, "canvas"), { recursive: true, force: true });
  await mkdir(path.join(env.dir, "canvas"), { recursive: true });
});
afterEach(() => env.cleanup());

const put = (rel: string, text: string) => writeFile(path.join(env.dir, rel), text);

describe("canvas loaders", () => {
  it("uses the shipped blocks when the founder has no list", async () => {
    const v = await loadCanvas();
    expect(v.source).toBe("default");
    expect(v.cards).toHaveLength(9);
    expect(v.cards[0]).toMatchObject({ def: { id: "customer" }, block: null, flagged: null });
  });
  it("uses the founder's own list, and lists block files outside it", async () => {
    await put("canvas/blocks.md", "---\nblocks:\n  - id: partners\n    title: Key partners\n    prompt: Who helps you deliver?\n---\n");
    await put("canvas/customer.md", "---\nid: customer\ntext: Agency owners\n---\n");
    const v = await loadCanvas();
    expect(v.source).toBe("founder");
    expect(v.cards.map((c) => c.def.id)).toEqual(["partners"]);
    expect(v.others.map((o) => o.path)).toEqual(["canvas/customer.md"]);
  });
  it("falls back to the default list when the founder's list can't be read", async () => {
    await put("canvas/blocks.md", "---\nblocks: []\n---\n");
    const v = await loadCanvas();
    expect(v.configError?.path).toBe("canvas/blocks.md");
    expect(v.cards).toHaveLength(9);
  });
  it("flags a block whose id doesn't match its file name", async () => {
    await put("canvas/problem.md", "---\nid: customer\ntext: x\n---\n");
    const v = await loadCanvasBlock("problem");
    expect(v.status === "ready" && v.flagged?.error).toMatch(/id/);
  });
  it("an unknown block id is missing", async () => expect(await loadCanvasBlock("nope")).toEqual({ status: "missing" }));
});

describe("saveCanvasBlock", () => {
  it("saves a block with notes, keeping earlier wording in history", async () => {
    await saveCanvasBlock("customer", { text: "Agency owners", status: "untested", notes: "From the meetup" }, "2026-10-01");
    await saveCanvasBlock("customer", { text: "Owners of agencies with 10-50 caregivers", status: "some-evidence" }, "2026-10-13");
    const e = await readEntry("canvasBlock", "canvas/customer.md");
    expect(e?.ok && e.data).toMatchObject({ text: "Owners of agencies with 10-50 caregivers", status: "some-evidence", history: [{ date: "2026-10-01", text: "Agency owners" }] });
    expect(e?.ok && e.body.trim()).toBe("From the meetup");
  });
  it("rejects an unknown block, an empty belief and an unknown status", async () => {
    await expect(saveCanvasBlock("nope", { text: "x", status: "untested" }, "2026-10-13")).rejects.toThrow(/isn't a block/);
    await expect(saveCanvasBlock("customer", { text: " ", status: "untested" }, "2026-10-13")).rejects.toThrow(/belief/);
    await expect(saveCanvasBlock("customer", { text: "x", status: "proven" }, "2026-10-13")).rejects.toThrow(/tested/);
  });
  it("confirming an imported block clears its seeded mark", async () => {
    await put("canvas/problem.md", "---\nid: problem\ntext: Schedules are rebuilt by hand\nseeded: true\n---\n");
    await confirmImported("problem");
    const e = await readEntry("canvasBlock", "canvas/problem.md");
    expect(e?.ok && e.data.seeded).toBeUndefined();
    expect(e?.ok && e.data.text).toBe("Schedules are rebuilt by hand");
  });
});
