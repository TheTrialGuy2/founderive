import { describe, expect, it } from "vitest";
import { brokenLinks, describeBrokenLink, linksOf } from "./links";

const present = new Set(["tests/2026-10-06-paid-pilot.md", "conversations/2026-10-08-dana-ortiz.md", "founder.md"]);
const exists = (rel: string) => present.has(rel);

describe("linksOf", () => {
  it("reads each kind's link fields", () => {
    expect(linksOf("conversation", { relatedTests: ["tests/a.md"] })).toEqual([{ field: "relatedTests", target: "tests/a.md", expect: "test" }]);
    expect(linksOf("test", { relatedConversations: ["x"] })).toEqual([{ field: "relatedConversations", target: "x", expect: "conversation" }]);
    expect(linksOf("decision", { evidence: ["founder.md"], against: ["conversations/x.md"], relatedTest: null }).map((l) => [l.field, l.target])).toEqual([
      ["evidence", "founder.md"],
      ["against", "conversations/x.md"],
    ]);
    expect(linksOf("founder", { name: "Sam" })).toEqual([]);
  });
});

describe("brokenLinks", () => {
  it("passes links to existing records of the right kind", () => {
    expect(brokenLinks(linksOf("conversation", { relatedTests: ["tests/2026-10-06-paid-pilot.md"] }), exists)).toEqual([]);
  });
  it("reports a missing target", () => {
    expect(brokenLinks(linksOf("test", { relatedConversations: ["conversations/2026-10-01-gone.md"] }), exists)).toEqual([
      { field: "relatedConversations", target: "conversations/2026-10-01-gone.md", expect: "conversation", problem: "missing" },
    ]);
  });
  it("reports a target of the wrong kind, even if it exists", () => {
    expect(brokenLinks(linksOf("conversation", { relatedTests: ["founder.md"] }), exists)[0]).toMatchObject({ problem: "wrong-kind" });
  });
  it("decision evidence may point at any record, but it must exist", () => {
    expect(brokenLinks(linksOf("decision", { evidence: ["founder.md", "notes/missing.md"] }), exists).map((b) => b.target)).toEqual(["notes/missing.md"]);
  });
  it("a decision's evidence against must exist too", () => {
    expect(brokenLinks(linksOf("decision", { against: ["conversations/2026-10-08-dana-ortiz.md", "notes/missing.md"] }), exists)).toEqual([
      { field: "against", target: "notes/missing.md", expect: null, problem: "missing" },
    ]);
  });
  it("describes each problem in plain words", () => {
    expect(describeBrokenLink({ field: "relatedTests", target: "tests/x.md", expect: "test", problem: "wrong-kind" })).toBe(
      "relatedTests: tests/x.md isn't a test file name (tests/YYYY-MM-DD-name.md)",
    );
    expect(describeBrokenLink({ field: "evidence", target: "notes/missing.md", expect: null, problem: "missing" })).toBe("evidence: notes/missing.md isn't in founder-data");
  });
});
