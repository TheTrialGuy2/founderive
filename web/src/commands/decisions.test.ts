import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readEntry } from "../store/read";
import { clearLoopRecords, useTempData } from "../store/test-helpers";
import { createConversation } from "./conversations";
import { createDecision, loadDecisions, parseDecisionForm } from "./decisions";
import { DANA } from "./test-inputs";

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
  it("lists decisions newest first, flagging broken links", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    await writeFile(path.join(env.dir, "decisions/2026-10-01-old.md"), "---\ntitle: Old\ndate: 2026-10-01\ndecision: A\nwhy: B\nreversible: false\nevidence:\n  - conversations/2026-10-01-gone.md\n---\n");
    await writeFile(path.join(env.dir, "decisions/2026-10-05-new.md"), "---\ntitle: New\ndate: 2026-10-05\ndecision: C\nwhy: D\nreversible: true\n---\n");
    const v = await loadDecisions();
    expect(v.rows.map((r) => r.data.title)).toEqual(["New", "Old"]);
    expect(v.rows[1].broken).toHaveLength(1);
  });
});
