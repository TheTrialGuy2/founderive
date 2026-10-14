import { describe, expect, it } from "vitest";
import { dueItems, dueWords } from "./due";

const TODAY = "2026-10-14"; // a Wednesday in 2026-W42

describe("dueWords", () => {
  it("says dates in words, never 'overdue'", () => {
    expect(dueWords({ due: TODAY }, TODAY)).toBe("due today");
    expect(dueWords({ due: "2026-10-16" }, TODAY)).toBe("due Fri");
    expect(dueWords({ due: "2026-10-12" }, TODAY)).toBe("due Mon");
    expect(dueWords({ due: "2026-10-08" }, TODAY)).toBe("from last week");
    expect(dueWords({ due: "2026-09-30" }, TODAY)).toBe("from Sep 30");
    expect(dueWords({ due: "2026-10-27" }, TODAY)).toBe("due Oct 27");
  });
  it("says where an undated carried item came from", () => {
    expect(dueWords({ due: null, week: "2026-W41" }, TODAY)).toBe("from last week");
    expect(dueWords({ due: null, week: "2026-W39" }, TODAY)).toBe("from week 2026-W39");
    expect(dueWords({ due: null, week: "2026-W42" }, TODAY)).toBe("");
  });
});

describe("dueItems", () => {
  it("merges open commitments and open homework, soonest first, undated last", () => {
    const items = dueItems({
      commitments: [
        { id: "c-1", text: "Undated", status: "open", week: "2026-W42" },
        { id: "c-2", text: "Fri", due: "2026-10-16", status: "open", week: "2026-W42" },
        { id: "c-3", text: "Done", due: "2026-10-12", status: "done", week: "2026-W42" },
      ],
      homework: [{ id: "h-1", title: "Mon", due: "2026-10-12", status: "open" }],
    });
    expect(items.map((i) => i.text)).toEqual(["Mon", "Fri", "Undated"]);
    expect(items[0]).toMatchObject({ kind: "homework", key: "homework:h-1", week: null });
    expect(items[1]).toMatchObject({ kind: "commitment", key: "commitment:2026-W42:c-2" });
  });
});
