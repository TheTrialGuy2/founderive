import { describe, expect, it } from "vitest";
import type { PathConversation } from "./path";
import { byNewest, challengers, chipText, stanceCounts } from "./stance";

const conv = (path: string, over: Partial<PathConversation["data"]> = {}, notes = "Notes in the founder's words."): PathConversation => ({
  path,
  data: {
    type: "customer",
    person: "Dana",
    date: path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("/") + 11),
    quotes: [],
    numbers: [],
    followUps: [],
    relatedTests: [],
    areas: ["problem"],
    whatChangesConfirmed: true,
    ...over,
  },
  notes,
});

describe("stanceCounts", () => {
  it("counts supports and challenges among feedback conversations on the step; neither and unset count in neither lane", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { stance: "supports" }),
      conv("conversations/2026-10-02-b.md", { stance: "supports" }),
      conv("conversations/2026-10-03-c.md", { stance: "challenges" }),
      conv("conversations/2026-10-04-d.md", { stance: "neither" }),
      conv("conversations/2026-10-05-e.md"),
    ];
    expect(stanceCounts(rows, "problem")).toEqual({ supports: 2, challenges: 1 });
  });
  it("ignores advice, unconfirmed imports, conversations with nothing recorded and conversations off the step", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { type: "mentor", stance: "challenges" }),
      conv("conversations/2026-10-02-b.md", { seeded: true, stance: "challenges" }),
      conv("conversations/2026-10-03-c.md", { stance: "challenges" }, ""),
      conv("conversations/2026-10-04-d.md", { areas: ["revenue"], stance: "challenges" }),
      conv("conversations/2026-10-05-e.md", { stance: "supports" }),
    ];
    expect(stanceCounts(rows, "problem")).toEqual({ supports: 1, challenges: 0 });
  });
  it("an untagged conversation counts for the customer step, as discussesStep says", () => {
    expect(stanceCounts([conv("conversations/2026-10-01-a.md", { areas: [], stance: "challenges" })], "customer")).toEqual({ supports: 0, challenges: 1 });
  });
  it("a stance on an unconfirmed interpretation counts nowhere", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { stance: "supports", whatChangesConfirmed: false }),
      conv("conversations/2026-10-02-b.md", { stance: "challenges", whatChangesConfirmed: false }),
    ];
    expect(stanceCounts(rows, "problem")).toEqual({ supports: 0, challenges: 0 });
  });
});

describe("challengers", () => {
  it("returns the challenging feedback conversations on the step, newest first, by file date when the date is unknown", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { stance: "challenges" }),
      conv("conversations/2026-10-09-b.md", { stance: "challenges", date: null }),
      conv("conversations/2026-10-05-c.md", { stance: "supports" }),
      conv("conversations/2026-10-07-d.md", { stance: "challenges", type: "investor" }),
      conv("conversations/2026-10-03-e.md", { stance: "challenges" }),
    ];
    expect(challengers(rows, "problem").map((r) => r.path)).toEqual(["conversations/2026-10-09-b.md", "conversations/2026-10-03-e.md", "conversations/2026-10-01-a.md"]);
  });
  it("byNewest breaks a date tie by path so the order is stable", () => {
    const rows = [conv("conversations/2026-10-02-zed.md"), conv("conversations/2026-10-02-amy.md"), conv("conversations/2026-10-04-kim.md")];
    expect([...rows].sort(byNewest).map((r) => r.path)).toEqual(["conversations/2026-10-04-kim.md", "conversations/2026-10-02-amy.md", "conversations/2026-10-02-zed.md"]);
  });
  it("doesn't list a conversation whose stance is on an unconfirmed interpretation", () => {
    const rows = [conv("conversations/2026-10-01-a.md", { stance: "challenges", whatChangesConfirmed: false })];
    expect(challengers(rows, "problem")).toEqual([]);
  });
});

describe("chipText", () => {
  const none = { supports: 0, challenges: 0 };
  it("reads as today with no stances", () => {
    expect(chipText(4, none, false, false)).toBe("4 people discussed this");
    expect(chipText(1, none, false, false)).toBe("1 person discussed this");
    expect(chipText(0, none, false, true)).toBe("Your guess · not discussed yet");
    expect(chipText(0, none, false, false)).toBe("Your guess");
  });
  it("a supported test still outranks talk", () => {
    expect(chipText(4, { supports: 3, challenges: 1 }, true, false)).toBe("Tested · supported");
  });
  it("adds each lane that has anyone in it and drops a zero", () => {
    expect(chipText(4, { supports: 3, challenges: 1 }, false, false)).toBe("4 people discussed this · 3 support · 1 challenges");
    expect(chipText(4, { supports: 2, challenges: 0 }, false, false)).toBe("4 people discussed this · 2 support");
    expect(chipText(3, { supports: 0, challenges: 2 }, false, true)).toBe("3 people discussed this · 2 challenge");
    expect(chipText(3, { supports: 1, challenges: 2 }, false, false)).toBe("3 people discussed this · 1 supports · 2 challenge");
  });
});
