import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createConversation } from "./conversations";
import { loadLogged, loadPeople } from "./lists";
import { DANA } from "./test-inputs";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("lists", () => {
  it("lists people, feedback first by default, everyone on request", async () => {
    const all = await loadPeople("all");
    expect(all.total).toBeGreaterThan(0);
    expect(all.cards[0]).toHaveProperty("person");
    const fb = await loadPeople("feedback");
    expect(fb.cards.every((c) => c.feedback)).toBe(true);
    expect(fb.total).toBe(all.total);
  });
  it("lists imported conversations waiting for the founder, and counts them on every filter", async () => {
    await createConversation({ ...DANA, person: "Maya", org: null, date: "2026-10-07" }, { seeded: true, source: "chat import" });
    await writeFile(path.join(env.dir, "conversations/2026-10-09-broken.md"), "---\nseeded: true\ntype: customer\n---\n");
    const imp = await loadPeople("imported");
    expect(imp.cards.map((c) => c.person)).toEqual(["Maya"]);
    expect(imp.cards[0]).toMatchObject({ imported: true, path: expect.stringMatching(/^conversations\/2026-10-07-maya/) });
    expect(imp.flaggedImports.map((f) => f.path)).toEqual(["conversations/2026-10-09-broken.md"]);
    expect((await loadPeople("feedback")).imported).toBe(1);
    expect((await loadPeople("feedback")).cards.some((c) => c.imported)).toBe(false);
  });
  it("lists every record newest first, filtered by type and text", async () => {
    const all = await loadLogged({ type: "", q: "" });
    expect(new Set(all.rows.map((r) => r.kind))).toEqual(new Set(["conversation", "test", "decision"]));
    expect(all.rows.map((r) => r.date)).toEqual([...all.rows.map((r) => r.date)].sort().reverse());
    expect((await loadLogged({ type: "test", q: "" })).rows.every((r) => r.kind === "test")).toBe(true);
    expect((await loadLogged({ type: "", q: "PILOT" })).rows.every((r) => /pilot/i.test(r.title))).toBe(true);
  });
});
