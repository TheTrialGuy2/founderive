import { describe, expect, it } from "vitest";
import type { TestStatus } from "../store/schemas";
import { canUnlink, checkCompletion, currentTest, groupTests, linkableTests, whyFrom, type CompletionForm } from "./venture-tests";

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
    expect(currentTest(rows, [])).toMatchObject({ path: "tests/b.md", slug: "b", due: "2026-10-20", evidenceCount: 0 });
  });
  it("has no current test when none is running", () => expect(currentTest([row("tests/c.md", "planned")], [])).toBeNull());
  const conv = (path: string, type: "customer" | "mentor", relatedTests: string[], notes = "Notes") => ({ path, data: { type, observedBehavior: null, quotes: [], numbers: [], relatedTests }, notes });
  it("counts only reciprocal customer evidence on the current test, never advice or a one-sided link", () => {
    const rows = [{ path: "tests/a.md", data: { title: "A", status: "running" as const, relatedConversations: ["conversations/c.md", "conversations/m.md", "conversations/half.md"], evidenceStrength: "weak" as const } }];
    const conversations = [conv("conversations/c.md", "customer", ["tests/a.md"]), conv("conversations/m.md", "mentor", ["tests/a.md"]), conv("conversations/half.md", "customer", [])];
    expect(currentTest(rows, conversations)).toMatchObject({ linkedCount: 2, evidenceCount: 1 });
    // The caller must pass the conversations; there's no default that would count a link by omission.
    // @ts-expect-error the conversations are required
    expect(() => currentTest(rows)).toThrow();
  });
  it("never makes an imported test the founder hasn't confirmed the current test", () => {
    const rows = [{ path: "tests/a.md", data: { title: "A", status: "running" as const, seeded: true, relatedConversations: [], evidenceStrength: "none" as const } }];
    expect(currentTest(rows, [])).toBeNull();
  });
  it("reads the why back without the decision label", () => expect(whyFrom("**Revise.** The price didn't hold")).toBe("The price didn't hold"));
});

describe("linking from a conversation", () => {
  const tests = [
    { path: "tests/p.md", status: "planned" as const },
    { path: "tests/r.md", status: "running" as const },
    { path: "tests/c.md", status: "complete" as const },
    { path: "tests/a.md", status: "abandoned" as const },
    { path: "tests/linked.md", status: "running" as const },
  ];
  it("offers only planned and running tests it isn't linked to yet", () =>
    expect(linkableTests(tests, ["tests/linked.md"]).map((t) => t.path)).toEqual(["tests/p.md", "tests/r.md"]));
  it("offers Unlink only for an open test or a broken link", () => {
    expect([...tests.map((t) => canUnlink(t)), canUnlink(undefined)]).toEqual([true, true, false, false, true, true]);
  });
});
