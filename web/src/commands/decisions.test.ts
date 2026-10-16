import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { createConversation } from "./conversations";
import { createDecision, loadDecisions, parseDecisionForm, recordOutcome, resolveDecision } from "./decisions";
import { confirmImportedRecord } from "./import";
import { DANA, MENTOR } from "./test-inputs";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => {
  env = await useTempData();
  await clearLoopRecords(env.dir);
});
afterEach(() => env.cleanup());

const form = (fields: Record<string, string | string[]>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
  return fd;
};

describe("decision log", () => {
  it("needs a decision, a why and whether it's reversible", () => {
    const r = parseDecisionForm(form({ title: "Focus", date: "2026-10-09", decision: "", why: "", reversible: "" }));
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["decision", "reversible", "why"]);
  });
  it("logs a decision with evidence that exists", async () => {
    const c = await createConversation(DANA);
    const r = parseDecisionForm(
      form({
        title: "Focus on small agencies",
        date: "2026-10-09",
        area: "customer",
        beliefBefore: "Any agency is a fit",
        alternatives: "Large agencies\nIndependent caregivers",
        decision: "Only agencies with 10-50 caregivers",
        why: "The owner feels the pain directly",
        reversible: "yes",
        evidence: [c],
        relatedTest: "",
      }),
    );
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const rel = await createDecision(r.input);
    expect(rel).toBe("decisions/2026-10-09-focus-on-small-agencies.md");
    const e = await readEntry("decision", rel);
    expect(e?.ok && e.data).toMatchObject({ area: "customer", reversible: true, evidence: [c], alternatives: ["Large agencies", "Independent caregivers"], relatedTest: null });
  });
  it("parks an open question and resolves the same file in place", async () => {
    const conflict = parseDecisionForm(form({ title: "Who pays?", date: "2026-10-15", status: "open", decision: "stale", why: "stale", reversible: "yes" }));
    expect(!conflict.ok && Object.keys(conflict.errors).sort()).toEqual(["decision", "reversible", "why"]);
    const parsed = parseDecisionForm(form({ title: "Who pays?", date: "2026-10-15", status: "open", decideBy: "2026-10-29", alternatives: "Founder\nAgency" }));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    const rel = await createDecision(parsed.input);
    let entry = await readEntry("decision", rel);
    expect(entry?.ok && entry.data).toMatchObject({ status: "open", decideBy: "2026-10-29", decision: null, why: null, reversible: null });
    await resolveDecision(rel, { decision: "Agency pays", why: "They receive the value", reversible: "yes", revisitOn: "" });
    entry = await readEntry("decision", rel);
    expect(entry?.ok && entry.data).toMatchObject({ status: "decided", decision: "Agency pays", why: "They receive the value", reversible: true });
  });
  it("the related test must be a test; evidence may be any record", async () => {
    const c = await createConversation(DANA);
    const r = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", evidence: [c, "founder.md"], relatedTest: c }));
    if (!r.ok) throw new Error("fixture invalid");
    await expect(createDecision(r.input)).rejects.toThrow(/related test/);
    expect(await createDecision({ ...r.input, relatedTest: null })).toBe("decisions/2026-10-09-x.md");
  });
  it("refuses evidence that isn't in founder-data", async () => {
    const r = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", evidence: ["conversations/2026-10-01-gone.md"] }));
    if (!r.ok) throw new Error("fixture invalid");
    await expect(createDecision(r.input)).rejects.toThrow(/isn't there anymore/);
  });
  it("keeps evidence against beside evidence for, and refuses a record in both lists", async () => {
    const c = await createConversation(DANA);
    const m = await createConversation(MENTOR);
    const both = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", evidence: [c], against: [c] }));
    expect(!both.ok && both.errors).toEqual({ against: "A record can be for or against, not both." });
    expect(!both.ok && both.values).toMatchObject({ evidence: c, against: c }); // the form keeps both choices
    const r = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", evidence: [c], against: [m] }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const rel = await createDecision(r.input);
    const e = await readEntry("decision", rel);
    expect(e?.ok && e.data).toMatchObject({ evidence: [c], against: [m] });
  });
  it("evidence against defaults to none and must be in founder-data", async () => {
    const none = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no" }));
    if (!none.ok) throw new Error("fixture invalid");
    expect(none.input.against).toEqual([]);
    const gone = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", against: ["conversations/2026-10-01-gone.md"] }));
    if (!gone.ok) throw new Error("fixture invalid");
    await expect(createDecision(gone.input)).rejects.toThrow(/isn't there anymore/);
  });
  it("a broken against link is a warning on the decision, like evidence", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    await writeFile(path.join(env.dir, "decisions/2026-10-03-against.md"), "---\ntitle: Against\ndate: 2026-10-03\ndecision: A\nwhy: B\nreversible: false\nagainst:\n  - conversations/2026-10-01-gone.md\n---\n");
    const v = await loadDecisions();
    expect(v.rows.find((r) => r.data.title === "Against")?.broken).toEqual([{ field: "against", target: "conversations/2026-10-01-gone.md", expect: null, problem: "missing" }]);
  });
  it("lists decisions newest first, flagging broken links", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    await writeFile(path.join(env.dir, "decisions/2026-10-01-old.md"), "---\ntitle: Old\ndate: 2026-10-01\ndecision: A\nwhy: B\nreversible: false\nevidence:\n  - conversations/2026-10-01-gone.md\n---\n");
    await writeFile(path.join(env.dir, "decisions/2026-10-05-new.md"), "---\ntitle: New\ndate: 2026-10-05\ndecision: C\nwhy: D\nreversible: true\n---\n");
    const v = await loadDecisions();
    expect(v.rows.map((r) => r.data.title)).toEqual(["New", "Old"]);
    expect(v.rows[1].broken).toHaveLength(1);
  });
  it("labels each conversation it can cite as customer evidence or advice", async () => {
    const dana = await createConversation(DANA);
    const mentor = await createConversation(MENTOR);
    const labels = Object.fromEntries((await loadDecisions()).evidenceOptions.map((o) => [o.path, o.label]));
    expect(labels[dana]).toBe("Conversation · Dana Ortiz · 2026-10-08 · customer evidence");
    expect(labels[mentor]).toBe("Conversation · Chris Lee · 2026-10-08 · advice");
  });
  it("carries the decision's body as notes", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    const body = "## What we heard most often\n\nFaster onboarding, every time.\n\n## Message to test this week\n\nTry ‘Set up in a day.’\n";
    await writeFile(path.join(env.dir, "decisions/2026-10-09-focus-on-small-agencies.md"), `---\ntitle: Focus on small agencies\ndate: 2026-10-09\ndecision: C\nwhy: D\nreversible: true\n---\n${body}`);
    const v = await loadDecisions();
    expect(v.rows[0].notes).toBe(body);
  });
  it("keeps a revisit date on a decided record only, on or after the decision's date", async () => {
    const before = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "2026-10-01" }));
    expect(!before.ok && before.errors).toEqual({ revisitOn: "Pick a revisit date on or after the decision's date." });
    expect(!before.ok && before.values.revisitOn).toBe("2026-10-01");
    const bad = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "soon" }));
    expect(!bad.ok && bad.errors).toEqual({ revisitOn: "Use a real revisit date." });
    const open = parseDecisionForm(form({ title: "X", date: "2026-10-09", status: "open", revisitOn: "2026-11-09" }));
    expect(!open.ok && open.errors).toEqual({ revisitOn: "Choose ‘A decision already made,’ or clear this for an open question." });
    const same = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "2026-10-09" }));
    expect(same.ok && same.input.revisitOn).toBe("2026-10-09");
    const r = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "2026-11-09" }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const rel = await createDecision(r.input);
    const e = await readEntry("decision", rel);
    expect(e?.ok && e.data).toMatchObject({ revisitOn: "2026-11-09" });
    const none = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no" }));
    expect(none.ok && none.input.revisitOn).toBeNull();
  });
  it("resolving an open question can set the revisit date", async () => {
    const parsed = parseDecisionForm(form({ title: "Who pays?", date: "2026-10-15", status: "open" }));
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
    const rel = await createDecision(parsed.input);
    await expect(resolveDecision(rel, { decision: "Agency pays", why: "They benefit", reversible: "yes", revisitOn: "2026-10-01" })).rejects.toThrow(/after the decision/);
    await expect(resolveDecision(rel, { decision: "Agency pays", why: "They benefit", reversible: "yes", revisitOn: "soon" })).rejects.toThrow(/real revisit date/);
    await resolveDecision(rel, { decision: "Agency pays", why: "They benefit", reversible: "yes", revisitOn: "2026-11-15" });
    const e = await readEntry("decision", rel);
    expect(e?.ok && e.data).toMatchObject({ status: "decided", revisitOn: "2026-11-15" });
    expect(await readFile(path.join(env.dir, rel), "utf8")).not.toMatch(/revisitedOn/);
  });
  it("records what happened once, without touching the rest of the body", async () => {
    const r = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "2026-10-20" }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const rel = await createDecision(r.input);
    const file = path.join(env.dir, rel);
    await writeFile(file, `${(await readFile(file, "utf8")).replace(/\s+$/, "")}\n## Why in full\n\nThe owner feels it.\n`);
    await expect(recordOutcome(rel, "  ", "2026-10-21")).rejects.toThrow(/what happened/);
    await recordOutcome(rel, "Two of five signed.", "2026-10-21");
    const e = await readEntry("decision", rel);
    expect(e?.ok && e.data.revisitedOn).toBe("2026-10-21");
    expect(e?.ok && e.body.trim()).toBe("## Why in full\n\nThe owner feels it.\n\n## Outcome\n\nTwo of five signed.");
    await expect(recordOutcome(rel, "Again", "2026-10-22")).rejects.toThrow(/already been revisited/);
  });
  it("refuses an outcome on a decision that no longer exists, or a date that isn't real", async () => {
    await expect(recordOutcome("decisions/2026-10-01-gone.md", "x", "2026-10-21")).rejects.toThrow(/no longer exists/);
    const r = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "2026-10-20" }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const rel = await createDecision(r.input);
    await expect(recordOutcome(rel, "x", "soon")).rejects.toThrow(/real date/);
  });
  it("refuses an outcome on an imported decision until the founder confirms it", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    await writeFile(
      path.join(env.dir, "decisions/2026-10-05-imp.md"),
      "---\nseeded: true\nsource: notes\ntitle: Imp\ndate: 2026-10-05\ndecision: C\nwhy: D\nreversible: true\nrevisitOn: 2026-10-01\n---\n",
    );
    await expect(recordOutcome("decisions/2026-10-05-imp.md", "x", "2026-10-21")).rejects.toThrow(/imported decision first/);
  });
  it("refuses an outcome on an open question or a decision without a revisit date", async () => {
    const open = parseDecisionForm(form({ title: "Who pays?", date: "2026-10-15", status: "open" }));
    if (!open.ok) throw new Error("fixture invalid");
    await expect(recordOutcome(await createDecision(open.input), "x", "2026-10-21")).rejects.toThrow(/Decide it first/);
    const plain = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no" }));
    if (!plain.ok) throw new Error("fixture invalid");
    await expect(recordOutcome(await createDecision(plain.input), "x", "2026-10-21")).rejects.toThrow(/no revisit date/);
  });
  it("an imported decision shows as seeded until the founder confirms it", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    await writeFile(path.join(env.dir, "decisions/2026-10-05-imp.md"), "---\nseeded: true\nsource: folder import 2026-10-13 #abc\ntitle: Imp\ndate: 2026-10-05\ndecision: C\nwhy: D\nreversible: true\n---\n");
    expect((await loadDecisions()).rows[0].data.seeded).toBe(true);
    await confirmImportedRecord("decisions/2026-10-05-imp.md");
    expect((await loadDecisions()).rows[0].data.seeded).toBeUndefined();
  });
});
