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
  it("includes an open decision once with its decide-by date and link", () => {
    expect(
      dueItems({ commitments: [], homework: [], decisions: [{ id: "decisions/2026-10-15-who-pays.md", title: "Who pays?", decideBy: "2026-10-20", href: "/decisions#2026-10-15-who-pays" }] }),
    ).toEqual([
      { key: "decision:decisions/2026-10-15-who-pays.md", kind: "decision", id: "decisions/2026-10-15-who-pays.md", text: "Decide: Who pays?", due: "2026-10-20", week: null, href: "/decisions#2026-10-15-who-pays" },
    ]);
  });
  it("includes a decision whose revisit date has come, keyed by its path, linking to it, sorted with the rest", () => {
    const items = dueItems({
      commitments: [{ id: "c-1", text: "Fri", due: "2026-10-16", status: "open", week: "2026-W42" }],
      homework: [],
      revisits: [{ id: "decisions/2026-10-09-focus.md", title: "Focus on small agencies", href: "/decisions#2026-10-09-focus", revisitOn: "2026-10-12" }],
    });
    expect(items[0]).toEqual({ key: "revisit:decisions/2026-10-09-focus.md", kind: "revisit", id: "decisions/2026-10-09-focus.md", text: "What happened after: Focus on small agencies?", due: "2026-10-12", week: null, href: "/decisions#2026-10-09-focus" });
    expect(items.map((i) => i.text)).toEqual(["What happened after: Focus on small agencies?", "Fri"]);
  });
});

describe("dueItems with follow-ups", () => {
  it("includes follow-ups that are due, keyed by their existing id, with the conversation's link", () => {
    const items = dueItems({
      commitments: [{ id: "c-2", text: "Fri", due: "2026-10-16", status: "open", week: "2026-W42" }],
      homework: [],
      followUps: [{ id: "conversations/2026-10-08-dana.md#f-1", text: "Follow up with Dana: send the price", href: "/conversations/2026-10-08-dana", due: "2026-10-12" }],
    });
    expect(items.map((i) => i.text)).toEqual(["Follow up with Dana: send the price", "Fri"]);
    expect(items[0]).toMatchObject({ kind: "followup", id: "conversations/2026-10-08-dana.md#f-1", key: "followup:conversations/2026-10-08-dana.md#f-1", href: "/conversations/2026-10-08-dana", week: null });
  });
});

