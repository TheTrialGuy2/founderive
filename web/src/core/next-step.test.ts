import { describe, expect, it } from "vitest";
import { activeChoices, nextStep, rankCandidates, type NextStepInput } from "./next-step";

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
  it("ranks a due follow-up (tier 5) above the guide step, carrying its conversation", () => {
    const n = nextStep({
      ...base,
      followUps: [{ id: "conversations/2026-10-08-dana.md#f-1", text: "Follow up with Dana: Send the one-pager", href: "/conversations/2026-10-08-dana", due: "2026-10-12" }],
    });
    expect(n).toMatchObject({ tier: 5, kind: "followup", ref: "conversations/2026-10-08-dana.md#f-1", href: "/conversations/2026-10-08-dana" });
  });
  it("ranks a commitment chosen after a test at tier 6, before a new guide step", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [{ id: "n", text: "Offer the pilot to three more owners", due: "2026-10-20", status: "open", link: "tests/2026-10-06-paid-pilot.md" }],
    });
    expect(ranked.map((c) => c.id)).toEqual(["commitment:n", "guide:riskiest-assumption"]);
    expect(ranked[0].reason).toBe("You chose this as the next step after a test.");
  });
  it("an overdue test commitment stays at tier 4", () => {
    const ranked = rankCandidates({ ...base, commitments: [{ id: "n", text: "Offer the pilot", due: "2026-10-10", status: "open", link: "tests/2026-10-06-paid-pilot.md" }] });
    expect(ranked.filter((c) => c.id === "commitment:n").map((c) => c.tier)).toEqual([4]);
  });
  it("carries the guide step's evidence so far", () => {
    const n = nextStep({ ...base, guideStep: { ...base.guideStep!, progress: "2 of 5 customer conversations logged" } });
    expect(n?.detail).toBe("2 of 5 customer conversations logged");
  });
});

describe("open guide commitments", () => {
  const guideCommitment = { id: "c-9", text: "Talk to five people who have the problem", status: "open" as const, link: "guide:problem-conversations" };
  it("rank at tier 6 as a commitment, with the committed reason", () => {
    const ranked = rankCandidates({ ...base, guideStep: null, commitments: [{ ...guideCommitment, due: "2026-10-16" }] });
    expect(ranked).toEqual([
      expect.objectContaining({ id: "commitment:c-9", tier: 6, kind: "commitment", label: "Talk to five people who have the problem", reason: "You committed to this step this week.", ref: "c-9" }),
    ]);
  });
  it("still rank at tier 4 once overdue", () => {
    const ranked = rankCandidates({ ...base, guideStep: null, commitments: [{ ...guideCommitment, due: "2026-10-12" }] });
    expect(ranked.map((c) => [c.id, c.tier])).toEqual([["commitment:c-9", 4]]);
  });
  it("replace any new guide step while open", () => {
    const ranked = rankCandidates({ ...base, commitments: [guideCommitment] });
    expect(ranked.filter((c) => c.kind === "guide")).toEqual([]);
    expect(nextStep({ ...base, commitments: [guideCommitment] })?.id).toBe("commitment:c-9");
  });
  it("done or dropped ones don't rank", () => {
    const ranked = rankCandidates({ ...base, commitments: [{ ...guideCommitment, status: "done" }, { ...guideCommitment, id: "c-10", status: "dropped" }] });
    expect(ranked.map((c) => c.id)).toEqual(["guide:riskiest-assumption"]);
  });
  it("open commitments not linked to the guide and not overdue don't rank", () => {
    const ranked = rankCandidates({ ...base, commitments: [{ id: "c-1", text: "Call Dana", due: "2026-10-20", status: "open", link: null }] });
    expect(ranked.map((c) => c.id)).toEqual(["guide:riskiest-assumption"]);
  });
});

describe("activeChoices", () => {
  const choice = (actionId: string, choice: "dismissed" | "deferred" | "replaced", until: string | null = null) => ({ date: "2026-10-14", actionId, label: "x", choice, reason: "r", until });
  const lastWeek = { week: "2026-W42", nextStepLog: [choice("guide:offer", "deferred", "2026-10-21"), choice("guide:customer", "dismissed"), choice("program:hw-1", "replaced"), choice("guide:old", "deferred", "2026-10-19")] };
  const thisWeek = { week: "2026-W43", nextStepLog: [choice("fix:a.md", "dismissed")] };

  it("keeps last week's deferral until its date (next Wednesday, seen this Monday)", () => {
    const active = activeChoices([lastWeek, thisWeek], "2026-W43", "2026-10-19");
    expect(active.map((c) => c.actionId).sort()).toEqual(["fix:a.md", "guide:offer"]);
    expect(nextStep({ ...base, today: "2026-10-19", guideStep: { id: "offer", title: "Write a small offer", why: "w" }, choices: active })).toBeNull();
  });
  it("drops last week's dismissals and replacements, and deferrals that have come due", () => {
    const active = activeChoices([lastWeek], "2026-W43", "2026-10-21");
    expect(active).toEqual([]);
  });
});
