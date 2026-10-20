import { describe, expect, it } from "vitest";
import { parseSourceLink, sortLinkedCommitments, sourceLabel, type LinkedCommitment } from "./commitment-source";

describe("parseSourceLink", () => {
  it("recognises a conversation, test or decision path", () => {
    expect(parseSourceLink("conversations/2026-10-08-dana-ortiz.md")).toEqual({ kind: "conversation", path: "conversations/2026-10-08-dana-ortiz.md" });
    expect(parseSourceLink("tests/2026-10-06-paid-pilot.md")).toEqual({ kind: "test", path: "tests/2026-10-06-paid-pilot.md" });
    expect(parseSourceLink("decisions/2026-10-09-focus.md")).toEqual({ kind: "decision", path: "decisions/2026-10-09-focus.md" });
  });
  it("is not a guide, step, program, canvas or founder link", () => {
    for (const link of ["guide:customer", "step:customer", "program/week-05.md", "canvas/customer.md", "founder.md", "checkins/2026-W42.md"]) expect(parseSourceLink(link)).toBeNull();
  });
  it("rejects traversal, absolute paths, bare names and empty values", () => {
    for (const link of ["../conversations/2026-10-08-dana-ortiz.md", "/conversations/2026-10-08-dana-ortiz.md", "conversations/dana.md", "conversations/2026-10-08-dana-ortiz", "", null, undefined])
      expect(parseSourceLink(link)).toBeNull();
  });
});

describe("sourceLabel", () => {
  it("says where a commitment came from, in words", () => {
    expect(sourceLabel("conversation", "Dana")).toBe("From conversation with Dana");
    expect(sourceLabel("decision", "Focus on small agencies")).toBe("From decision: Focus on small agencies");
    expect(sourceLabel("test", "Paid pilot")).toBe("From test: Paid pilot");
  });
});

describe("sortLinkedCommitments", () => {
  const c = (over: Partial<LinkedCommitment>): LinkedCommitment => ({ week: "2026-W42", id: "c", text: "x", due: null, status: "open", reason: null, ...over });
  it("puts open first by due date (undated last), then newest week; closed newest week first", () => {
    const sorted = sortLinkedCommitments([
      c({ id: "done-old", status: "done", week: "2026-W40" }),
      c({ id: "open-undated-new", week: "2026-W42" }),
      c({ id: "open-fri", due: "2026-10-16" }),
      c({ id: "dropped-new", status: "dropped", week: "2026-W42", reason: "Changed plan" }),
      c({ id: "open-undated-old", week: "2026-W41" }),
      c({ id: "open-mon", due: "2026-10-12", week: "2026-W41" }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["open-mon", "open-fri", "open-undated-new", "open-undated-old", "dropped-new", "done-old"]);
  });
  it("does not change its input", () => {
    const input = [c({ id: "b", status: "done" }), c({ id: "a" })];
    sortLinkedCommitments(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
