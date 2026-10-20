import { describe, expect, it } from "vitest";
import { byNewestDecision, decisionHref } from "./decision-order";

describe("decision order", () => {
  it("sorts newest first, then by path", () => {
    const rows = [
      { path: "decisions/2026-10-01-b.md", data: { date: "2026-10-01" } },
      { path: "decisions/2026-10-09-a.md", data: { date: "2026-10-09" } },
      { path: "decisions/2026-10-01-a.md", data: { date: "2026-10-01" } },
    ];
    expect([...rows].sort(byNewestDecision).map((r) => r.path)).toEqual(["decisions/2026-10-09-a.md", "decisions/2026-10-01-a.md", "decisions/2026-10-01-b.md"]);
  });
  it("links to the page the decision is on, newest first, ten per page", () => {
    expect(decisionHref(0, "decisions/2026-10-09-a.md")).toBe("/decisions#2026-10-09-a");
    expect(decisionHref(9, "decisions/2026-10-01-b.md")).toBe("/decisions#2026-10-01-b");
    expect(decisionHref(10, "decisions/2026-09-30-c.md")).toBe("/decisions?page=2#2026-09-30-c");
  });
});
