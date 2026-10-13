import { describe, expect, it } from "vitest";
import { applyWeekPlan, blockBody, describeDraft, ignoredAfterBlock, matchesExistingConversation, weekPreviewRows, parseImportBlock, parseWeekBlock, weekPlanBlocked } from "./paste-bridge";

const BLOCKS = [
  { id: "customer", title: "Customer" },
  { id: "partners", title: "Key partners" },
];
const fence = (lang: string, body: string) => `Here you go:\n\`\`\`${lang}\n${body}\n\`\`\`\nAnything else?`;

describe("blockBody", () => {
  it("reads inside the fence, ignoring text around it", () => expect(blockBody(fence("founderive-import", "## Founder\nventure: Lantern"), "founderive-import")).toBe("## Founder\nventure: Lantern\n"));
  it("reads the whole text when the fence was lost in copying", () => expect(blockBody("## Founder\nventure: Lantern", "founderive-import")).toBe("## Founder\nventure: Lantern"));
});

describe("parseImportBlock", () => {
  it("accepts any subset of the founder lines", () => {
    expect(parseImportBlock("## Founder\nventure: Lantern\ncustomer: Agency owners", BLOCKS)).toEqual({
      drafts: [{ kind: "founder", fields: { venture: "Lantern", targetCustomer: "Agency owners" } }],
      errors: [],
    });
  });
  it("matches a canvas block by id or by the founder's own title, ignoring case", () => {
    const r = parseImportBlock("## Canvas: CUSTOMER\nOwners of small agencies\n## Canvas: key partners\nLocal staffing firms", BLOCKS);
    expect(r.drafts.map((d) => (d.kind === "canvas" ? d.id : ""))).toEqual(["customer", "partners"]);
    expect(r.errors).toEqual([]);
  });
  it("reports a canvas name that matches no block", () => {
    expect(parseImportBlock("## Canvas: pricing\nCheap", BLOCKS).errors).toEqual(['Line 1: "pricing" isn\'t a block in your canvas (customer, partners).']);
  });
  it("reads a conversation; a missing date means unknown", () => {
    const r = parseImportBlock("## Conversation\nperson: Dana\ntype: customer\nnotes: Rebuilds the schedule every Friday", BLOCKS);
    expect(r.errors).toEqual([]);
    expect(r.drafts[0]).toMatchObject({ kind: "conversation", input: { person: "Dana", type: "customer", date: null, notes: "Rebuilds the schedule every Friday", quotes: [] } });
  });
  it("needs a conversation type, and checks types and dates", () => {
    expect(parseImportBlock("## Conversation\nperson: Dana", BLOCKS).errors).toEqual(["Line 1: a conversation needs a type: line (customer, prospect, mentor, partner, investor or other)."]);
    expect(parseImportBlock("## Conversation\nperson: Dana\ntype: friend\ndate: 2026-02-30", BLOCKS).errors).toEqual([
      'Line 3: "friend" isn\'t a conversation type (customer, prospect, mentor, partner, investor or other).',
      'Line 4: "2026-02-30" isn\'t a real date as YYYY-MM-DD.',
    ]);
  });
  it("reads an assumption's belief and optional risk", () => {
    expect(parseImportBlock("## Assumption\nbelief: Owners will pay $200 a month", BLOCKS).drafts).toEqual([{ kind: "assumption", belief: "Owners will pay $200 a month", risk: null }]);
    expect(parseImportBlock("## Assumption\nrisk: They won't", BLOCKS).errors).toEqual(["Line 1: an assumption needs a belief: line."]);
  });
  it("shows every unreadable line as an error with its line number, never dropping it", () => {
    const r = parseImportBlock("Hello!\n## Founder\nventure: Lantern\nmy favorite color: teal\nfounded: 2026\n## Pricing\nCheap", BLOCKS);
    expect(r.errors).toEqual([
      'Line 1: "Hello!" is outside any section. Start a section with ## Founder, ## Canvas: <block>, ## Assumption or ## Conversation.',
      'Line 4: can\'t read "my favorite color: teal" under ## Founder.',
      'Line 5: can\'t read "founded: 2026" under ## Founder.',
      'Line 6: "## Pricing" isn\'t a section Founderive reads.',
    ]);
    expect(r.drafts).toEqual([{ kind: "founder", fields: { venture: "Lantern" } }]);
  });
  it("describes each draft for the preview", () => {
    const r = parseImportBlock("## Founder\nventure: Lantern\nproblem: Schedules\n## Canvas: customer\nOwners\n## Conversation\nperson: Dana\ntype: prospect", BLOCKS);
    expect(r.drafts.map(describeDraft)).toEqual(["Founder details: venture, problem (only where empty)", "Canvas · Customer", "Conversation: Dana (prospect), date unknown"]);
  });
});

describe("parseWeekBlock", () => {
  const open = [
    { id: "c-1", text: "Email the two agencies" },
    { id: "c-3", text: "Call Lee" },
    { id: "c-4", text: "Draft the one-pager" },
  ];
  it("reads a full update; kept changes nothing; unlisted commitments are not reviewed", () => {
    const plan = parseWeekBlock(
      fence("founderive-week", "outcome: Book three demos\nkept: c-1\ndone: c-3\nnew: Visit two agencies | 2026-10-16\nnew: Ask Chris for intros |\nblocker: No intros yet\nhelp: Chris, for two intros"),
      open,
    );
    expect(plan).toEqual({
      outcome: "Book three demos",
      kept: [{ id: "c-1", text: "Email the two agencies" }],
      done: [{ id: "c-3", text: "Call Lee" }],
      dropped: [],
      added: [
        { text: "Visit two agencies", due: "2026-10-16" },
        { text: "Ask Chris for intros", due: null },
      ],
      blocker: "No intros yet",
      help: "Chris, for two intros",
      notReviewed: [{ id: "c-4", text: "Draft the one-pager" }],
      errors: [],
    });
  });
  it("an omitted outcome, or the app's own fill, keeps the current outcome", () => {
    expect(parseWeekBlock("done: c-1", open).outcome).toBeNull();
    expect(parseWeekBlock("outcome: none yet", open)).toMatchObject({ outcome: null, errors: [] });
    expect(parseWeekBlock("kept: none open", open).errors).toEqual([]);
  });
  it("blocks on an unknown id", () => expect(parseWeekBlock("done: c-9", open).errors).toEqual(['Line 1: "c-9" isn\'t one of this week\'s open commitments.']));
  it("blocks on a dropped line without a reason", () => expect(parseWeekBlock("dropped: c-1", open).errors).toEqual(["Line 1: dropped c-1 needs a reason after the bar."]));
  it("blocks on an unreadable line", () =>
    expect(parseWeekBlock("I finished most of it\nwins: two calls", open).errors).toEqual(['Line 1: can\'t read "I finished most of it".', 'Line 2: "wins" isn\'t a line Founderive reads.']));
  it("blocks on two status lines for one commitment, and on a bad due date", () =>
    expect(parseWeekBlock("done: c-1\ndropped: c-1 | changed my mind\nnew: Call Dana | next Tuesday", open).errors).toEqual([
      "Line 2: c-1 already has a done line.",
      'Line 3: "next Tuesday" isn\'t a date as YYYY-MM-DD. Leave it blank after the bar if there\'s no date.',
    ]));
  it("an empty paste is an error, not an update that clears everything", () =>
    expect(parseWeekBlock("```founderive-week\n\n```", open).errors).toEqual(["There's nothing to apply. Paste the whole block your chat gave you."]));
  it("keeps a dropped reason that contains the word or", () =>
    expect(parseWeekBlock("dropped: c-1 | they replied by phone or email", open).dropped).toEqual([{ id: "c-1", text: "Email the two agencies", reason: "they replied by phone or email" }]));
});

// Edge cases beyond the brief: pasted text from a chat is untrusted, so each of these is pinned down.
describe("blockBody, edge cases", () => {
  it("reads to the end when the closing fence was lost", () => expect(blockBody("```founderive-week\ndone: c-1\nkept: c-3", "founderive-week")).toBe("done: c-1\nkept: c-3"));
  it("handles Windows line endings and a trailing space after the language", () =>
    expect(blockBody("```founderive-week \r\ndone: c-1\r\n```", "founderive-week")).toBe("done: c-1\r\n"));
  it("ignores a fence for the other block", () => expect(blockBody("```founderive-week\ndone: c-1\n```", "founderive-import")).toBe("```founderive-week\ndone: c-1\n```"));
});

describe("parseImportBlock, edge cases", () => {
  it("reads only inside the fence; headings ignore case", () => {
    expect(parseImportBlock(fence("founderive-import", "## founder\nventure: Lantern"), BLOCKS)).toEqual({ drafts: [{ kind: "founder", fields: { venture: "Lantern" } }], errors: [] });
  });
  it("refuses a placeholder echoed from the prompt instead of saving it", () => {
    expect(parseImportBlock("## Founder\nventure: …\nname: ...\n## Canvas: customer\n<my current belief, in my words>", BLOCKS).errors).toEqual([
      'Line 2: "…" is a placeholder from the prompt, not your words. Replace it or leave the line out.',
      'Line 3: "..." is a placeholder from the prompt, not your words. Replace it or leave the line out.',
      'Line 5: "<my current belief, in my words>" is a placeholder from the prompt, not your words. Replace it or leave the line out.',
    ]);
  });
  it("reports a repeated line, an empty value and an empty canvas section", () => {
    expect(parseImportBlock("## Founder\nventure: A\nventure: B\nname:\n## Canvas: customer", BLOCKS).errors).toEqual([
      "Line 3: venture appears twice under ## Founder.",
      "Line 4: name has no value. Leave the line out instead.",
      "Line 5: ## Canvas: customer has no text under it.",
    ]);
  });
  it("reports the same canvas block twice, so one wording isn't silently lost", () => {
    expect(parseImportBlock("## Canvas: customer\nOwners\n## Canvas: Customer\nManagers", BLOCKS).errors).toEqual(["Line 3: ## Canvas: Customer is the second section for the customer block. Keep one."]);
  });
  it("reports a second ## Founder section", () => {
    expect(parseImportBlock("## Founder\nventure: A\n## Founder\nname: Sam", BLOCKS).errors).toEqual(["Line 3: ## Founder appears twice. Put all founder lines under one."]);
  });
  it("needs a person in a conversation", () => {
    const r = parseImportBlock("## Conversation\ntype: customer", BLOCKS);
    expect(r).toEqual({ drafts: [], errors: ["Line 1: a conversation needs a person: line (a first name or a role)."] });
  });
  it("reports a value that ran onto a second line", () => {
    expect(parseImportBlock("## Conversation\nperson: Dana\ntype: customer\nnotes: Rebuilds the schedule\nevery Friday by hand", BLOCKS).errors).toEqual([
      'Line 5: can\'t read "every Friday by hand" under ## Conversation.',
    ]);
  });
  it("creates no draft for a section with an error", () => {
    expect(parseImportBlock("## Conversation\nperson: Dana\ntype: friend\n## Canvas: customer\nOwners", BLOCKS).drafts).toEqual([
      { kind: "canvas", id: "customer", title: "Customer", text: "Owners" },
    ]);
  });
  it("keeps a multi-line canvas belief", () => {
    expect(parseImportBlock("## Canvas: customer\nOwners of small agencies\nwho schedule by hand", BLOCKS).drafts).toEqual([
      { kind: "canvas", id: "customer", title: "Customer", text: "Owners of small agencies\nwho schedule by hand" },
    ]);
  });
  it("describes an assumption as not saved", () => {
    expect(describeDraft({ kind: "assumption", belief: "Owners pay", risk: null })).toBe("Assumption (not saved; you'll get a link to make it a test): Owners pay");
  });
});

describe("parseWeekBlock, edge cases", () => {
  const open = [
    { id: "c-1", text: "Email the two agencies" },
    { id: "c-3", text: "Call Lee" },
  ];
  it("refuses a placeholder echoed from the prompt", () =>
    expect(parseWeekBlock("outcome: <my outcome as it stands now>\nhelp: …", open).errors).toEqual([
      'Line 1: "<my outcome as it stands now>" is a placeholder from the prompt, not your words. Replace it or leave the line out.',
      'Line 2: "…" is a placeholder from the prompt, not your words. Replace it or leave the line out.',
    ]));
  it("still reports an unknown line whose value is an app fill", () => expect(parseWeekBlock("wins: none yet", open).errors).toEqual(['Line 1: "wins" isn\'t a line Founderive reads.']));
  it("reads app fills in any case as nothing", () => expect(parseWeekBlock("outcome: None Yet\nkept: None open", open)).toMatchObject({ outcome: null, kept: [], errors: [] }));
  it("reports a status line with no id", () => expect(parseWeekBlock("kept:", open).errors).toEqual(["Line 1: kept needs a commitment id."]));
  it("reports a repeated outcome, blocker or help line", () =>
    expect(parseWeekBlock("outcome: A\noutcome: B\nhelp: Chris\nhelp: Lee", open).errors).toEqual(["Line 2: outcome appears twice.", "Line 4: help appears twice."]));
  it("reports a new line with nothing before the bar", () => expect(parseWeekBlock("new: | 2026-10-16", open).errors).toEqual(["Line 1: new needs what you're committing to before the bar."]));
  it("refuses an impossible due date", () => expect(parseWeekBlock("new: Call Dana | 2026-02-30", open).errors).toHaveLength(1));
  it("numbers lines inside the fence", () => expect(parseWeekBlock(fence("founderive-week", "done: c-1\ndone: c-9"), open).errors).toEqual(['Line 2: "c-9" isn\'t one of this week\'s open commitments.']));
  it("ids are matched exactly, not by prefix or case", () => expect(parseWeekBlock("done: C-1\ndone: c-", open).errors).toHaveLength(2));
});

describe("applyWeekPlan", () => {
  const base = () => ({
    week: "2026-W42",
    outcome: "Old outcome",
    blocker: "Old blocker",
    helpNeeded: "Old help",
    commitments: [
      { id: "c-1", text: "Email", status: "open" as const, due: null, reason: null, link: null },
      { id: "c-3", text: "Call", status: "open" as const, due: null, reason: null, link: null },
      { id: "c-4", text: "Draft", status: "open" as const, due: null, reason: null, link: null },
    ],
    nextStepLog: [],
  });
  it("applies every part of the plan to the check-in", () => {
    const c = base();
    const open = c.commitments.map((x) => ({ id: x.id, text: x.text }));
    applyWeekPlan(c, parseWeekBlock("outcome: New\nkept: c-1\ndone: c-3\ndropped: c-4 | not this week\nnew: Visit | 2026-10-16\nhelp: Chris", open), () => "c-new");
    expect(c).toMatchObject({ outcome: "New", blocker: "Old blocker", helpNeeded: "Chris" });
    expect(c.commitments.map((x) => [x.id, x.status, x.reason])).toEqual([
      ["c-1", "open", null],
      ["c-3", "done", null],
      ["c-4", "dropped", "not this week"],
      ["c-new", "open", null],
    ]);
  });
  it("keeps the outcome when the plan has none", () => {
    const c = base();
    applyWeekPlan(c, parseWeekBlock("kept: c-1", [{ id: "c-1", text: "Email" }]), () => "x");
    expect(c.outcome).toBe("Old outcome");
  });
  it("throws when a commitment in the plan is gone from the check-in", () => {
    const c = base();
    c.commitments = c.commitments.filter((x) => x.id !== "c-3");
    expect(() => applyWeekPlan(c, parseWeekBlock("done: c-3", [{ id: "c-3", text: "Call" }]), () => "x")).toThrow(/isn't in this week's check-in anymore/);
  });
});

// Review fixes (Task 11): a cut-off answer, blocker and help words, a stray bar, text after the block, contact details.
describe("review fixes: the weekly block", () => {
  const open = [
    { id: "c-1", text: "Email the two agencies" },
    { id: "c-3", text: "Call Lee" },
  ];
  it("a cut-off answer blocks: every open commitment needs a kept, done or dropped line", () => {
    const plan = parseWeekBlock("outcome: Book three demos\ndone: c-1", open);
    expect(plan.notReviewed).toEqual([{ id: "c-3", text: "Call Lee" }]);
    expect(weekPlanBlocked(plan)).toBe(true);
    expect(weekPlanBlocked(parseWeekBlock("done: c-1\nkept: c-3", open))).toBe(false);
  });
  it.each(["none", "None", "nothing", "N/A", "n/a", "no", "NO"])("blocker or help %j clears the field", (word) => {
    const plan = parseWeekBlock(`kept: c-1\nkept: c-3\nblocker: ${word}\nhelp: ${word}`, open);
    expect(plan).toMatchObject({ blocker: null, help: null, errors: [] });
  });
  it("an omitted blocker or help line keeps the current value", () => {
    const plan = parseWeekBlock("kept: c-1\nkept: c-3", open);
    expect(plan.blocker).toBeUndefined();
    expect(plan.help).toBeUndefined();
  });
  it("a real blocker that starts with no is kept as written", () => expect(parseWeekBlock("kept: c-1\nkept: c-3\nblocker: no intros yet", open).blocker).toBe("no intros yet"));
  it("done or kept with something after a bar is an error, not trimmed", () =>
    expect(parseWeekBlock("done: c-1 | sent both\nkept: c-3 | slow", open).errors).toEqual([
      'Line 1: done takes only a commitment id. Remove "| sent both", or use dropped if you need a reason.',
      'Line 2: kept takes only a commitment id. Remove "| slow", or use dropped if you need a reason.',
    ]));
});

describe("review fixes: applyWeekPlan", () => {
  const base = () => ({
    week: "2026-W42",
    outcome: "Old outcome",
    blocker: "Old blocker",
    helpNeeded: "Old help",
    commitments: [{ id: "c-1", text: "Email", status: "open" as const, due: null, reason: null, link: null }],
    nextStepLog: [],
  });
  const open = [{ id: "c-1", text: "Email" }];
  it("keeps the blocker and help when their lines are left out", () => {
    const c = base();
    applyWeekPlan(c, parseWeekBlock("kept: c-1", open), () => "x");
    expect(c).toMatchObject({ blocker: "Old blocker", helpNeeded: "Old help" });
  });
  it("clears them on none", () => {
    const c = base();
    applyWeekPlan(c, parseWeekBlock("kept: c-1\nblocker: none\nhelp: n/a", open), () => "x");
    expect(c).toMatchObject({ blocker: null, helpNeeded: null });
  });
  it("names new commitments by their line ordinal", () => {
    const c = base();
    applyWeekPlan(c, parseWeekBlock("kept: c-1\nnew: Visit |\nnew: Call |", open), (n) => `c-op-${n}`);
    expect(c.commitments.map((x) => x.id)).toEqual(["c-1", "c-op-1", "c-op-2"]);
  });
});

describe("review fixes: text after the block", () => {
  it("notes text after the closing fence", () => expect(ignoredAfterBlock("```founderive-week\nkept: c-1\n```\nLet me know if you need more!", "founderive-week")).toBe(true));
  it("notes a second block", () => expect(ignoredAfterBlock("```founderive-import\n## Founder\nname: Sam\n```\n```founderive-import\n## Founder\nname: Al\n```", "founderive-import")).toBe(true));
  it("is quiet when nothing follows, or when the fence was lost", () => {
    expect(ignoredAfterBlock("Sure:\n```founderive-week\nkept: c-1\n```\n  \n", "founderive-week")).toBe(false);
    expect(ignoredAfterBlock("kept: c-1", "founderive-week")).toBe(false);
  });
});

describe("review fixes: no contact details", () => {
  const conv = (person: string) => parseImportBlock(`## Conversation\ntype: customer\nperson: ${person}`, BLOCKS);
  it.each(["dana@agency.com", "https://linkedin.com/in/dana", "www.dana.io", "linkedin.com/in/dana", "+1 (704) 555-0182", "704-555-0182", "7045550182"])("refuses %j as a person", (p) => {
    const r = conv(p);
    expect(r.drafts).toEqual([]);
    expect(r.errors).toEqual(["Line 3: person looks like contact details. Use a first name or a role instead, like Dana or agency owner."]);
  });
  it.each(["Dana", "agency owner", "Owner of 3 agencies", "Dr. Lee"])("accepts %j", (p) => expect(conv(p).errors).toEqual([]));
});

describe("review fixes: a conversation already logged", () => {
  const existing = [{ person: "Dana", type: "customer" as const, date: "2026-10-12" }, { person: "Lee", type: "prospect" as const, date: null }];
  const input = (person: string, type: "customer" | "prospect", date: string | null) => ({ person, type, date });
  it("matches the same person, type and date, ignoring case", () => {
    expect(matchesExistingConversation(input("dana", "customer", "2026-10-12"), existing)).toBe(true);
    expect(matchesExistingConversation(input("Lee", "prospect", null), existing)).toBe(true);
  });
  it("doesn't match a different type or date", () => {
    expect(matchesExistingConversation(input("Dana", "prospect", "2026-10-12"), existing)).toBe(false);
    expect(matchesExistingConversation(input("Dana", "customer", "2026-10-13"), existing)).toBe(false);
  });
});

describe("review fixes: the weekly preview", () => {
  const open = [{ id: "c-1", text: "Email" }];
  const rows = (text: string, current: { blocker?: string | null; help?: string | null }) => weekPreviewRows(parseWeekBlock(text, open), current);
  it("says the blocker and help will be cleared only when there's one now", () => {
    expect(rows("kept: c-1\nblocker: none\nhelp: none", { blocker: "No intros", help: "Chris" })).toEqual(
      expect.arrayContaining(["Blocker will be cleared", "Help request will be cleared"]),
    );
    const quiet = rows("kept: c-1\nblocker: none\nhelp: none", { blocker: null, help: "" });
    expect(quiet.some((r) => /cleared/.test(r))).toBe(false);
  });
  it("says nothing about a blocker or help line that was left out", () => expect(rows("kept: c-1", { blocker: "No intros", help: "Chris" }).some((r) => /Blocker|Help/.test(r))).toBe(false));
  it("lists commitments that weren't reviewed", () => expect(rows("outcome: x", {})).toContain("Not reviewed: Email"));
});
