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
  it("done commitments don't rank; overdue ones rank at 4, open ones not yet due at 6", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [
        { id: "a", text: "Late", due: "2026-10-12", status: "open" },
        { id: "b", text: "Done", due: "2026-10-01", status: "done" },
        { id: "c", text: "Later", due: "2026-10-20", status: "open" },
      ],
    });
    expect(ranked.filter((c) => c.kind === "commitment").map((c) => [c.ref, c.tier])).toEqual([
      ["a", 4],
      ["c", 6],
    ]);
  });
  it("a conversation- or decision-linked commitment is an ordinary commitment; a test-linked one keeps tier 7", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [
        { id: "conv", text: "Send Dana the outline", due: "2026-10-20", status: "open", link: "conversations/2026-10-08-dana-ortiz.md" },
        { id: "dec", text: "Tell the team", due: "2026-10-21", status: "open", link: "decisions/2026-10-09-focus.md" },
        { id: "late", text: "Late one", due: "2026-10-10", status: "open", link: "decisions/2026-10-09-focus.md" },
        { id: "test", text: "Offer five pilots", due: "2026-10-22", status: "open", link: "tests/2026-10-06-paid-pilot.md" },
      ],
    });
    expect(ranked.filter((c) => c.kind === "commitment").map((c) => [c.ref, c.tier])).toEqual([
      ["late", 4],
      ["conv", 6],
      ["dec", 6],
      ["test", 7],
    ]);
    expect(ranked.find((c) => c.ref === "conv")?.reason).toBe("You committed to this for this week.");
  });
  it("orders guide (8) before program work (9) before upkeep (10)", () => {
    const ranked = rankCandidates({
      ...base,
      programWork: [{ id: "hw-1", title: "Interview two owners", due: "2026-10-20" }],
      flagged: [{ path: "program/week-02.md", error: "bad" }],
    });
    expect(ranked.map((c) => c.tier)).toEqual([8, 9, 10]);
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
  it("ranks a commitment chosen after a test at tier 7, before a new guide step", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [{ id: "n", text: "Offer the pilot to three more owners", due: "2026-10-20", status: "open", link: "tests/2026-10-06-paid-pilot.md" }],
    });
    expect(ranked.map((c) => c.id)).toEqual(["commitment:n", "guide:riskiest-assumption"]);
    expect(ranked[0]).toMatchObject({ tier: 7, reason: "You chose this as the next step after a test." });
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
  it("rank at tier 7 as a commitment, with the committed reason", () => {
    const ranked = rankCandidates({ ...base, guideStep: null, commitments: [{ ...guideCommitment, due: "2026-10-16" }] });
    expect(ranked).toEqual([
      expect.objectContaining({ id: "commitment:c-9", tier: 7, kind: "commitment", label: "Talk to five people who have the problem", reason: "You committed to this step this week.", ref: "c-9" }),
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
});

describe("open commitments that aren't overdue (do what you said before a new guide step)", () => {
  const open = (id: string, due: string | null, text = `Commitment ${id}`) => ({ id, text, due, status: "open" as const, link: null });
  it("rank at tier 6, above the guide step, labeled with the commitment", () => {
    const ranked = rankCandidates({ ...base, commitments: [open("c-1", "2026-10-16", "Call Dana")] });
    expect(ranked.map((c) => [c.id, c.tier])).toEqual([
      ["commitment:c-1", 6],
      ["guide:riskiest-assumption", 8],
    ]);
    expect(ranked[0]).toMatchObject({ kind: "commitment", label: "Call Dana", reason: "You committed to this for this week.", ref: "c-1", due: "2026-10-16" });
    expect(nextStep({ ...base, commitments: [open("c-1", "2026-10-16", "Call Dana")] })?.id).toBe("commitment:c-1");
  });
  it("one due today still ranks at 6, not as overdue", () => {
    expect(rankCandidates({ ...base, commitments: [open("c-1", "2026-10-13")] })[0]).toMatchObject({ id: "commitment:c-1", tier: 6 });
  });
  it("one that matches this week's outcome outranks the guide step", () => {
    const n = nextStep({ ...base, outcome: "Talk to five agency owners", commitments: [open("c-1", null, "Talk to five agency owners")] });
    expect(n).toMatchObject({ id: "commitment:c-1", tier: 6 });
  });
  it("an overdue one stays at tier 4 and isn't ranked again at 6", () => {
    const ranked = rankCandidates({ ...base, commitments: [open("c-1", "2026-10-10")] });
    expect(ranked.filter((c) => c.id === "commitment:c-1").map((c) => c.tier)).toEqual([4]);
  });
  it("sit below a due follow-up", () => {
    const n = nextStep({ ...base, commitments: [open("c-1", "2026-10-16")], followUps: [{ id: "f", text: "Follow up with Dana", href: "/conversations/x", due: "2026-10-12" }] });
    expect(n?.kind).toBe("followup");
  });
  it("orders earliest due first, undated after dated, then file order", () => {
    const ranked = rankCandidates({ ...base, guideStep: null, commitments: [open("u1", null), open("late", "2026-10-18"), open("u2", null), open("early", "2026-10-14"), open("late2", "2026-10-18")] });
    expect(ranked.map((c) => c.ref)).toEqual(["early", "late", "late2", "u1", "u2"]);
  });
  it("leave guide-linked and test-chosen commitments at tier 7, ranked once", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [
        { id: "g", text: "Talk to five people", due: "2026-10-16", status: "open", link: "guide:problem-conversations" },
        { id: "t", text: "Offer the pilot", due: "2026-10-15", status: "open", link: "tests/2026-10-06-paid-pilot.md" },
        open("c-1", "2026-10-17"),
      ],
    });
    expect(ranked.map((c) => [c.id, c.tier])).toEqual([
      ["commitment:c-1", 6],
      ["commitment:g", 7],
      ["commitment:t", 7],
    ]);
  });
  it("with no commitments, the guide step is next as before", () => {
    expect(nextStep(base)).toMatchObject({ id: "guide:riskiest-assumption", tier: 8 });
  });
  it("done or dropped ones don't rank", () => {
    const ranked = rankCandidates({ ...base, commitments: [{ ...open("d", "2026-10-16"), status: "done" }, { ...open("x", "2026-10-16"), status: "dropped" }] });
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

describe("commitments carried from an earlier week", () => {
  const base = { today: "2026-10-19", weekId: "2026-W43", outcome: "Ship", blocker: null, risks: [], currentTests: [], followUps: [], guideStep: null, programWork: [], flagged: [], choices: [] };
  it("rank exactly like this week's, keep their week, and say where they came from", () => {
    const ranked = rankCandidates({
      ...base,
      commitments: [
        { id: "a", text: "Overdue from last week", due: "2026-10-12", status: "open", week: "2026-W42" },
        { id: "b", text: "Open from last week", due: "2026-10-23", status: "open", week: "2026-W42" },
        { id: "c", text: "Test next step", status: "open", link: "tests/2026-10-06-pilot.md", week: "2026-W42" },
      ],
    });
    expect(ranked.map((c) => [c.id, c.tier, c.week])).toEqual([
      ["commitment:2026-W42:a", 4, "2026-W42"],
      ["commitment:2026-W42:b", 6, "2026-W42"],
      ["commitment:2026-W42:c", 7, "2026-W42"],
    ]);
    expect(ranked[1].reason).toBe("You committed to this in week 2026-W42, and it's still open.");
  });
});

describe("commitment action ids across weeks", () => {
  const base = { today: "2026-10-19", weekId: "2026-W43", outcome: "Ship", blocker: null, risks: [], currentTests: [], followUps: [], guideStep: null, programWork: [], flagged: [] };
  const commitments = [
    { id: "c-9", text: "Forty-two", due: "2026-10-12", status: "open" as const, week: "2026-W42" },
    { id: "c-9", text: "Forty-three", due: "2026-10-12", status: "open" as const, week: "2026-W43" },
  ];
  it("namespaces the id by week, keeping ref the local id", () =>
    expect(rankCandidates({ ...base, choices: [], commitments }).map((c) => [c.id, c.ref, c.week])).toEqual([
      ["commitment:2026-W42:c-9", "c-9", "2026-W42"],
      ["commitment:2026-W43:c-9", "c-9", "2026-W43"],
    ]));
  it("still honors a choice recorded with an old-format id, for this week's commitment only", () => {
    const choices = [{ actionId: "commitment:c-9", choice: "dismissed" as const, date: "2026-10-19" }];
    expect(nextStep({ ...base, choices, commitments })?.id).toBe("commitment:2026-W42:c-9");
    expect(nextStep({ ...base, choices, commitments: [commitments[1]] })).toBeNull();
  });
  it("a new-format choice hides only that week's commitment", () => {
    const choices = [{ actionId: "commitment:2026-W42:c-9", choice: "dismissed" as const, date: "2026-10-19" }];
    expect(nextStep({ ...base, choices, commitments })?.id).toBe("commitment:2026-W43:c-9");
  });
  it("resolves an old-format choice to the week it was logged in, not this week", () => {
    const choices = [{ actionId: "commitment:c-9", choice: "deferred" as const, date: "2026-10-13", until: "2026-10-21", sourceWeek: "2026-W42" }];
    // In W43: W42's carried c-9 stays hidden; this week's c-9 is not.
    expect(nextStep({ ...base, choices, commitments })?.id).toBe("commitment:2026-W43:c-9");
    expect(nextStep({ ...base, today: "2026-10-21", choices, commitments })?.id).toBe("commitment:2026-W42:c-9");
  });
});
