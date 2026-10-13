import { describe, expect, it } from "vitest";
import { dueFollowUps, groupConversations, isCustomerEvidence } from "./conversations";

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
