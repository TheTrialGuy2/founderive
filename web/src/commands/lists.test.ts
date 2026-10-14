import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { loadLogged, loadPeople } from "./lists";

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
  it("lists every record newest first, filtered by type and text", async () => {
    const all = await loadLogged({ type: "", q: "" });
    expect(new Set(all.rows.map((r) => r.kind))).toEqual(new Set(["conversation", "test", "decision"]));
    expect(all.rows.map((r) => r.date)).toEqual([...all.rows.map((r) => r.date)].sort().reverse());
    expect((await loadLogged({ type: "test", q: "" })).rows.every((r) => r.kind === "test")).toBe(true);
    expect((await loadLogged({ type: "", q: "PILOT" })).rows.every((r) => /pilot/i.test(r.title))).toBe(true);
  });
});
