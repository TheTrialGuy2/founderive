import { describe, expect, it } from "vitest";
import type { TestStatus } from "../store/schemas";
import { checkCompletion, currentTest, groupTests, whyFrom, type CompletionForm } from "./venture-tests";

const done: CompletionForm = {
  result: "supported",
  evidenceStrength: "moderate",
  learning: "Two owners signed",
  decision: "continue",
  why: "The price held",
  nextCommitment: "Onboard the two pilots",
  nextCommitmentDue: "2026-10-20",
};

describe("checkCompletion", () => {
  it("accepts a full completion", () => expect(checkCompletion(done)).toEqual({ ok: true, value: done }));
  it("never validates on its own: the founder picks the result", () => {
    const r = checkCompletion({ ...done, result: "" });
    expect(!r.ok && Object.keys(r.errors)).toEqual(["result"]);
  });
  it("a supported or contradicted result needs evidence; inconclusive doesn't", () => {
    expect(checkCompletion({ ...done, evidenceStrength: "none" }).ok).toBe(false);
    const c = checkCompletion({ ...done, result: "contradicted", evidenceStrength: "none" });
    expect(!c.ok && c.errors.evidenceStrength).toMatch(/inconclusive/);
    expect(checkCompletion({ ...done, result: "inconclusive", evidenceStrength: "none" }).ok).toBe(true);
  });
  it("keeps result and decision separate and needs the founder's own words", () => {
    const r = checkCompletion({ ...done, decision: "inconclusive", learning: " ", why: "", nextCommitment: "", nextCommitmentDue: "2026-02-30" });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["decision", "learning", "nextCommitment", "nextCommitmentDue", "why"]);
  });
  it("a next commitment is required, except when the decision is stop", () => {
    const r = checkCompletion({ ...done, decision: "stop", nextCommitment: "", nextCommitmentDue: "" });
    expect(r.ok && r.value).toMatchObject({ decision: "stop", nextCommitment: null, nextCommitmentDue: null });
    expect(checkCompletion({ ...done, decision: "pause", nextCommitment: "" }).ok).toBe(false);
  });
  it("the next commitment's due date is optional", () => {
    const r = checkCompletion({ ...done, nextCommitmentDue: "" });
    expect(r.ok && r.value.nextCommitmentDue).toBeNull();
  });
});

const row = (path: string, status: TestStatus, extra: { due?: string; closedOn?: string } = {}) => ({
  path,
  data: { title: path, status, relatedConversations: [], evidenceStrength: "none" as const, ...extra },
});

describe("groupTests and currentTest", () => {
  it("groups by status, soonest due first; closed newest first", () => {
    const rows = [
      row("tests/a.md", "running", { due: "2026-10-30" }),
      row("tests/b.md", "running", { due: "2026-10-20" }),
      row("tests/c.md", "planned"),
      row("tests/d.md", "complete", { closedOn: "2026-10-01" }),
      row("tests/e.md", "abandoned", { closedOn: "2026-10-05" }),
    ];
    const g = groupTests(rows);
    expect(g.running.map((r) => r.path)).toEqual(["tests/b.md", "tests/a.md"]);
    expect(g.planned.map((r) => r.path)).toEqual(["tests/c.md"]);
    expect(g.closed.map((r) => r.path)).toEqual(["tests/e.md", "tests/d.md"]);
    expect(currentTest(rows, () => true)).toMatchObject({ path: "tests/b.md", slug: "b", due: "2026-10-20", evidenceCount: 0 });
  });
  it("has no current test when none is running", () => expect(currentTest([row("tests/c.md", "planned")], () => true)).toBeNull());
  it("counts only customer evidence on the current test, never advice", () => {
    const rows = [{ path: "tests/a.md", data: { title: "A", status: "running" as const, relatedConversations: ["conversations/c.md", "conversations/m.md"], evidenceStrength: "weak" as const } }];
    expect(currentTest(rows, (p) => p === "conversations/c.md")).toMatchObject({ linkedCount: 2, evidenceCount: 1 });
    // The caller must say which links are customer evidence; there's no default that would count advice.
    // @ts-expect-error the evidence predicate is required
    expect(() => currentTest(rows)).toThrow();
  });
  it("reads the why back without the decision label", () => expect(whyFrom("**Revise.** The price didn't hold")).toBe("The price didn't hold"));
});
