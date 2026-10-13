import { describe, expect, it } from "vitest";
import { nextStep, rankCandidates, type NextStepInput } from "./next-step";

const base: NextStepInput = {
  today: "2026-10-13",
  outcome: "Talk to five agency owners",
  blocker: null,
  risks: [],
  currentTests: [],
  commitments: [],
  followUps: [],
  guideStep: { id: "riskiest-assumption", title: "Turn your riskiest assumption into a test", why: "Testing it first saves the most wasted work." },
  programWork: [],
  flagged: [],
  choices: [],
};

describe("nextStep", () => {
  it("asks for a weekly outcome first, suggesting the guide step", () => {
    const n = nextStep({ ...base, outcome: null });
    expect(n).toMatchObject({ id: "outcome", tier: 2, suggestion: "Turn your riskiest assumption into a test" });
  });
  it("puts a risk above everything", () => {
    const n = nextStep({ ...base, outcome: null, risks: [{ id: "cash", label: "Check runway", reason: "Cash covers under 4 weeks.", href: "/money" }] });
    expect(n?.id).toBe("risk:cash");
  });
  it("ranks a blocker above a running test", () => {
    const n = nextStep({ ...base, blocker: "Need intros to agencies", currentTests: [{ path: "tests/a.md", title: "Paid pilot", href: "/tests/a" }] });
    expect(n?.kind).toBe("blocker");
  });
  it("resumes a running test before overdue commitments", () => {
    const n = nextStep({
      ...base,
      currentTests: [{ path: "tests/a.md", title: "Paid pilot", href: "/tests/a" }],
      commitments: [{ id: "c-1", text: "Email agencies", due: "2026-10-10", status: "open" }],
    });
    expect(n).toMatchObject({ id: "test:tests/a.md", label: "Continue: Paid pilot" });
  });
  it("only overdue open commitments rank (not done, not future)", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [
        { id: "a", text: "Late", due: "2026-10-12", status: "open" },
        { id: "b", text: "Done", due: "2026-10-01", status: "done" },
        { id: "c", text: "Later", due: "2026-10-20", status: "open" },
      ],
    });
    expect(ranked.filter((c) => c.kind === "commitment").map((c) => c.ref)).toEqual(["a"]);
  });
  it("orders guide (6) before program work (7) before upkeep (8)", () => {
    const ranked = rankCandidates({
      ...base,
      programWork: [{ id: "hw-1", title: "Interview two owners", due: "2026-10-20" }],
      flagged: [{ path: "program/week-02.md", error: "bad" }],
    });
    expect(ranked.map((c) => c.tier)).toEqual([6, 7, 8]);
  });
  it("skips dismissed and replaced actions, and deferred ones until their date", () => {
    const input = { ...base, programWork: [{ id: "hw-1", title: "Interview two owners", due: null }] };
    expect(nextStep({ ...input, choices: [{ actionId: "guide:riskiest-assumption", choice: "dismissed", date: "2026-10-13" }] })?.id).toBe("program:hw-1");
    expect(nextStep({ ...input, choices: [{ actionId: "guide:riskiest-assumption", choice: "deferred", until: "2026-10-15", date: "2026-10-13" }] })?.id).toBe("program:hw-1");
    expect(nextStep({ ...input, choices: [{ actionId: "guide:riskiest-assumption", choice: "deferred", until: "2026-10-13", date: "2026-10-12" }] })?.id).toBe("guide:riskiest-assumption");
  });
  it("every candidate has a reason", () => {
    const ranked = rankCandidates({ ...base, outcome: null, blocker: "x", programWork: [{ id: "h", title: "t", due: null }], flagged: [{ path: "p", error: "e" }] });
    for (const c of ranked) expect(c.reason.length).toBeGreaterThan(0);
  });
  it("returns null when nothing is left", () => expect(nextStep({ ...base, guideStep: null })).toBeNull());
});
