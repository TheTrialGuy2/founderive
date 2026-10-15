import { describe, expect, it } from "vitest";
import { dueFollowUps, evidenceCount, groupConversations, isCustomerEvidence, isEvidenceEligible, needsInterpretation, testLinks, type ConversationRecord } from "./conversations";

type Row = Parameters<typeof dueFollowUps>[0][number];
const row = (path: string, type: Row["data"]["type"], date: string, followUps: Row["data"]["followUps"] = []): Row => ({ path, data: { type, date, person: "Dana", followUps } });

describe("groupConversations", () => {
  it("keeps customer and prospect conversations apart from advice, newest first", () => {
    const g = groupConversations([
      row("conversations/2026-10-01-a.md", "customer", "2026-10-01"),
      row("conversations/2026-10-03-b.md", "mentor", "2026-10-03"),
      row("conversations/2026-10-05-c.md", "prospect", "2026-10-05"),
      row("conversations/2026-10-04-d.md", "investor", "2026-10-04"),
    ]);
    expect(g.evidence.map((r) => r.path)).toEqual(["conversations/2026-10-05-c.md", "conversations/2026-10-01-a.md"]);
    expect(g.advice.map((r) => r.path)).toEqual(["conversations/2026-10-04-d.md", "conversations/2026-10-03-b.md"]);
  });
  it("only customers and prospects count as customer evidence", () => {
    const types: Row["data"]["type"][] = ["customer", "prospect", "mentor", "partner", "investor", "other"];
    expect(types.map(isCustomerEvidence)).toEqual([true, true, false, false, false, false]);
  });
});

describe("dueFollowUps", () => {
  it("lists open follow-ups due by today, oldest first, linking to the conversation", () => {
    const rows = [
      row("conversations/2026-10-08-dana.md", "customer", "2026-10-08", [
        { id: "f-1", text: "Send the one-pager", due: "2026-10-12", status: "open" },
        { id: "f-2", text: "Already done", due: "2026-10-10", status: "done" },
        { id: "f-3", text: "Later", due: "2026-10-20", status: "open" },
        { id: "f-4", text: "No date", status: "open" },
      ]),
      row("conversations/2026-10-02-lee.md", "mentor", "2026-10-02", [{ id: "f-9", text: "Thank Lee", due: "2026-10-11", status: "open" }]),
    ];
    expect(dueFollowUps(rows, "2026-10-13")).toEqual([
      { id: "conversations/2026-10-02-lee.md#f-9", text: "Follow up with Dana: Thank Lee", href: "/conversations/2026-10-02-lee", due: "2026-10-11" },
      { id: "conversations/2026-10-08-dana.md#f-1", text: "Follow up with Dana: Send the one-pager", href: "/conversations/2026-10-08-dana", due: "2026-10-12" },
    ]);
  });
});

const T = "tests/2026-10-06-pilot.md";
const conv = (path: string, over: Partial<ConversationRecord["data"]> = {}, notes = ""): ConversationRecord => ({
  path,
  data: { type: "customer", observedBehavior: null, quotes: [], numbers: [], relatedTests: [T], ...over },
  notes,
});

describe("isEvidenceEligible", () => {
  const empty = { type: "customer" as const, observedBehavior: null, quotes: [], numbers: [] };
  it("needs the conversation to record something: notes, what they do today, a quote or a number", () => {
    expect(isEvidenceEligible(empty, "")).toBe(false);
    expect(isEvidenceEligible(empty, "   \n")).toBe(false);
    expect(isEvidenceEligible({ ...empty, observedBehavior: "  " }, "")).toBe(false);
    expect(isEvidenceEligible(empty, "Rebuilds the schedule every Friday.")).toBe(true);
    expect(isEvidenceEligible({ ...empty, observedBehavior: "Uses a spreadsheet" }, "")).toBe(true);
    expect(isEvidenceEligible({ ...empty, quotes: ["I lose my Friday"] }, "")).toBe(true);
    expect(isEvidenceEligible({ ...empty, numbers: ["4 hours a week"] }, "")).toBe(true);
  });
  it("still refuses advice and unconfirmed imports, whatever they record", () => {
    expect(isEvidenceEligible({ ...empty, type: "mentor" }, "Long notes")).toBe(false);
    expect(isEvidenceEligible({ ...empty, seeded: true }, "Long notes")).toBe(false);
  });
  it("waits for interpretation only after customer evidence is confirmed", () => {
    expect(needsInterpretation({ ...empty }, "Notes")).toBe(true);
    expect(needsInterpretation({ ...empty, whatChangesConfirmed: true }, "Notes")).toBe(false);
    expect(needsInterpretation({ ...empty, seeded: true }, "Notes")).toBe(false);
    expect(needsInterpretation({ ...empty, type: "mentor" }, "Notes")).toBe(false);
    expect(needsInterpretation({ ...empty }, "")).toBe(false);
  });
});

describe("testLinks (one reciprocal-link rule)", () => {
  const test = { path: T, data: { relatedConversations: ["conversations/a.md", "conversations/b.md", "conversations/m.md", "conversations/e.md", "conversations/s.md"] } };
  const rows = [
    conv("conversations/a.md", {}, "Notes"), // both sides: evidence
    conv("conversations/b.md", { relatedTests: [] }, "Notes"), // test lists it, it doesn't list the test
    conv("conversations/c.md", {}, "Notes"), // it lists the test, the test doesn't list it
    conv("conversations/m.md", { type: "mentor" }, "Advice"),
    conv("conversations/e.md"), // reciprocal and confirmed, but records nothing
    conv("conversations/s.md", { seeded: true }, "Notes"),
    conv("conversations/z.md", { relatedTests: [] }, "Unrelated"),
  ];
  it("labels each link, counting only reciprocal, confirmed customer conversations with content", () => {
    expect(testLinks(test, rows).map((l) => [l.conversation.path, l.state])).toEqual([
      ["conversations/a.md", "evidence"],
      ["conversations/b.md", "needs-repair"],
      ["conversations/c.md", "needs-repair"],
      ["conversations/m.md", "advice"],
      ["conversations/e.md", "no-content"],
      ["conversations/s.md", "unconfirmed"],
    ]);
    expect(evidenceCount(test, rows)).toBe(1);
  });
  it("a reciprocal, confirmed, content-free customer conversation doesn't count", () =>
    expect(evidenceCount({ path: T, data: { relatedConversations: ["conversations/e.md"] } }, [conv("conversations/e.md")])).toBe(0));
  it("a partial write (only one side saved) never counts, from either side", () => {
    expect(evidenceCount({ path: T, data: { relatedConversations: ["conversations/a.md"] } }, [conv("conversations/a.md", { relatedTests: [] }, "Notes")])).toBe(0);
    expect(evidenceCount({ path: T, data: { relatedConversations: [] } }, [conv("conversations/a.md", {}, "Notes")])).toBe(0);
  });
});
