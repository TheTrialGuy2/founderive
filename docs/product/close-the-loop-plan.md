# Close the Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A founder sets a revisit date when they decide; when it comes, Home asks "What happened after: <title>?" and the decision's card takes one short answer that lands next to the decision for good.

**Architecture:** Two optional dates on the decision schema (`revisitOn`, `revisitedOn`), both only on a decided record. `dueItems()` in `core/due.ts` gains a fifth kind, `revisit`, so Home and `pnpm today --json` agree; `loadToday()` feeds it from decided, unimported decisions whose date has come and that have no `revisitedOn`. One new command, `recordOutcome`, sets `revisitedOn` and appends `## Outcome` to the body, which the card already renders. One new client component, `OutcomeForm`. No new page, no new file kind, no change to ranking rules.

**Tech Stack:** Next 16 (Cache Components, `await connection()` inside `<Suspense>`), React 19, TypeScript, Zod 4 schemas in `web/src/store/schemas.ts`, Vitest (`pnpm test` from `web/`), pnpm.

Spec: `docs/product/close-the-loop-direction.md`. Read it first.

## Global Constraints

- Everything under `web/` runs from `web/`: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm -s check-data`.
- `web/src/store/` is the only code that reads or writes founder-data. Core modules are pure and take records as arguments.
- The founder decides. Only the founder sets `revisitOn` (on the two decide forms) and the outcome (on the card). Nothing suggests a default date. No command infers either.
- Both fields belong only to a decided record; `revisitedOn` requires `revisitOn`. The schema enforces both. Older decisions have neither and stay valid.
- A revisit counts on Home only when the decision is decided, not imported (`seeded` absent), `revisitOn` is on or before today, and `revisitedOn` is absent. Not before the date.
- Exact copy, used verbatim:
  - Date field label: `Revisit on (optional)`, hint: `The day Home asks what happened.`
  - Bad date: `Pick a revisit date after the decision's date.` (a date equal to the decision's date is allowed)
  - Date on an open question: the existing open-conflict message, `Choose ‘A decision already made,’ or clear this for an open question.`
  - Due item text: `What happened after: <title>?`; Home's reason when it is the main action: `It's <due words>. Say what happened, in a line.`
  - Home link on the due item: `Say what happened`
  - Card line before the date: `Revisit on <date>`; after recording: `Revisited <date>`
  - Outcome form label: `What happened?`, placeholder: `Two of the five agencies signed; the third said the price was the problem, not the tool.`, button: `Record what happened`
  - Empty outcome: `Say what happened, even if it's “nothing yet”.`
  - Guards: `That decision has already been revisited. Reload the page.`, `An open question has no outcome yet. Decide it first.`, `This decision has no revisit date. Reload the page.`
- Links navigate and buttons act. Meaning never relies on colour alone. Client components start with `"use client"`.
- Dates are `YYYY-MM-DD`. The fixture in `web/test-data` pins `today: 2026-10-13`; `useTempData()` copies it.
- Commit after every task. Branch: `feat/close-the-loop` (already exists, holds the brief).
- No React rendering tests exist in this codebase. Components are checked by `pnpm lint`, `pnpm exec tsc --noEmit` and the dry run in Task 7. Behaviour lives in core and commands, which are tested.

---

### Task 1: The two dates on the decision schema

**Files:**
- Modify: `web/src/store/schemas.ts` (`decisionSchema`)
- Test: `web/src/store/loop-schemas.test.ts`

**Interfaces:**
- Produces: `decisionSchema` output gains `revisitOn?: string | null` and `revisitedOn?: string | null`; issues at `revisitOn` / `revisitedOn` on an open record; issue at `revisitedOn` when it lacks `revisitOn`.

- [ ] **Step 1: Write the failing test**

In `web/src/store/loop-schemas.test.ts`, inside `describe("decision", …)`, after the test `"refuses a record in both evidence and against"`, add:

```ts
  it("keeps a revisit date and the day it was revisited, only on a decided record", () => {
    expect(decisionSchema.parse(decision({ revisitOn: "2026-11-15", revisitedOn: "2026-11-16" }))).toMatchObject({ revisitOn: "2026-11-15", revisitedOn: "2026-11-16" });
    expect(decisionSchema.parse(decision()).revisitOn).toBeUndefined();
    expect(paths(decisionSchema, decision({ revisitedOn: "2026-11-16" }))).toEqual(["revisitedOn"]);
    const open = { title: "Who pays?", date: "2026-10-15", status: "open" };
    expect(paths(decisionSchema, { ...open, revisitOn: "2026-11-15" })).toEqual(["revisitOn"]);
    expect(paths(decisionSchema, { ...open, revisitedOn: "2026-11-15" })).toEqual(["revisitedOn"]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && pnpm test src/store/loop-schemas.test.ts`
Expected: FAIL on the first expectation (unknown key `revisitOn` rejected by `strictObject`).

- [ ] **Step 3: Add the fields and the rules**

In `web/src/store/schemas.ts`, in `decisionSchema`'s `strictObject`, after `relatedTest: z.string().nullish(),` add:

```ts
    revisitOn: isoDate.nullish(), // the day Home asks what happened; only on a decided record
    revisitedOn: isoDate.nullish(), // the day the founder recorded the outcome (## Outcome in the body); needs revisitOn
```

Replace the whole `.superRefine((d, ctx) => { … })` on `decisionSchema` with:

```ts
  .superRefine((d, ctx) => {
    if (d.against.some((p) => d.evidence.includes(p))) ctx.addIssue({ code: "custom", path: ["against"], message: "a record can be for or against, not both" });
    if (d.status === "open") {
      if (d.decision != null) ctx.addIssue({ code: "custom", path: ["decision"], message: "an open question does not have a decision yet" });
      if (d.why != null) ctx.addIssue({ code: "custom", path: ["why"], message: "an open question does not have a reason yet" });
      if (d.reversible != null) ctx.addIssue({ code: "custom", path: ["reversible"], message: "an open question is not classified as reversible yet" });
      if (d.revisitOn != null) ctx.addIssue({ code: "custom", path: ["revisitOn"], message: "an open question has no revisit date yet" });
      if (d.revisitedOn != null) ctx.addIssue({ code: "custom", path: ["revisitedOn"], message: "an open question has no outcome yet" });
      return;
    }
    if (!d.decision?.trim()) ctx.addIssue({ code: "custom", path: ["decision"], message: "a decided record needs the decision" });
    if (!d.why?.trim()) ctx.addIssue({ code: "custom", path: ["why"], message: "a decided record needs why" });
    if (d.reversible == null) ctx.addIssue({ code: "custom", path: ["reversible"], message: "a decided record needs reversible" });
    if (d.revisitedOn && !d.revisitOn) ctx.addIssue({ code: "custom", path: ["revisitedOn"], message: "revisitedOn needs a revisitOn" });
  });
```

(If the existing `superRefine` differs in a detail from the first three lines above, keep the existing lines and add only the three `revisit` checks in the positions shown.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && pnpm test src/store/loop-schemas.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add web/src/store/schemas.ts web/src/store/loop-schemas.test.ts
git commit -m "feat: a decided decision may carry a revisit date and the day it was revisited"
```

---

### Task 2: The `revisit` due kind and Home's reason

**Files:**
- Modify: `web/src/core/due.ts`
- Modify: `web/src/core/home.ts` (the `overdue` reason)
- Test: `web/src/core/due.test.ts`, `web/src/core/home.test.ts`

**Interfaces:**
- Produces:
  - `DueItem.kind` includes `"revisit"`
  - `dueItems()` input gains `revisits?: { id: string; title: string; href: string; revisitOn: string }[]`; each becomes `{ key: "revisit:<id>", kind: "revisit", id, text: "What happened after: <title>?", due: revisitOn, week: null, href }`
  - `homeAction()` reason for a late `revisit`: `It's <due words>. Say what happened, in a line.`

- [ ] **Step 1: Write the failing tests**

In `web/src/core/due.test.ts`, inside `describe("dueItems", …)`, after the test `"includes an open decision once with its decide-by date and link"`, add:

```ts
  it("includes a decision whose revisit date has come, keyed by its path, linking to it, sorted with the rest", () => {
    const items = dueItems({
      commitments: [{ id: "c-1", text: "Fri", due: "2026-10-16", status: "open", week: "2026-W42" }],
      homework: [],
      revisits: [{ id: "decisions/2026-10-09-focus.md", title: "Focus on small agencies", href: "/decisions#2026-10-09-focus", revisitOn: "2026-10-12" }],
    });
    expect(items[0]).toEqual({ key: "revisit:decisions/2026-10-09-focus.md", kind: "revisit", id: "decisions/2026-10-09-focus.md", text: "What happened after: Focus on small agencies?", due: "2026-10-12", week: null, href: "/decisions#2026-10-09-focus" });
    expect(items.map((i) => i.text)).toEqual(["What happened after: Focus on small agencies?", "Fri"]);
  });
```

In `web/src/core/home.test.ts`, inside `describe("homeAction", …)`, after `"counts a follow-up past its date as the main action"`, add:

```ts
  it("asks what happened after a decision whose revisit date has passed, in words", () => {
    const r: DueItem = { key: "revisit:decisions/2026-10-01-focus.md", kind: "revisit", id: "decisions/2026-10-01-focus.md", text: "What happened after: Focus on small agencies?", due: "2026-10-12", week: null, href: "/decisions#2026-10-01-focus" };
    const a = homeAction({ ...base, due: [r] });
    expect(a).toMatchObject({ kind: "overdue", key: r.key, label: "What happened after: Focus on small agencies?" });
    expect(a?.reason).toBe("It's due Mon. Say what happened, in a line.");
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/core/due.test.ts src/core/home.test.ts`
Expected: FAIL. `due.test.ts`: the `revisit` item is missing (items has one entry). `home.test.ts`: a type error on `kind: "revisit"` surfaces as the reason text not matching (`Finish it, or drop it with a reason.`).

- [ ] **Step 3: Add the kind**

In `web/src/core/due.ts`:

Change the `DueItem` type line to:

```ts
/** `href` is set for a follow-up (its conversation), a decision and a revisit (the decision's card). A follow-up's `id` is `<conversation path>#<follow-up id>`. */
export type DueItem = { key: string; kind: "commitment" | "homework" | "followup" | "decision" | "revisit"; id: string; text: string; due: string | null; week: string | null; href?: string };
```

Change the doc comment and signature of `dueItems` to:

```ts
/**
 * Open commitments (this week's and carried ones), open program homework, follow-ups due (open, due today or
 * earlier, as `dueFollowUps` returns them), open decisions with a decide-by date and decided decisions whose revisit
 * date has come (the caller filters by date), in one list, soonest first, undated last.
 */
export function dueItems(input: {
  commitments: { id: string; text: string; due?: string | null; status: string; week: string }[];
  homework: { id: string; title: string; due?: string | null; status: string }[];
  followUps?: { id: string; text: string; href: string; due: string }[];
  decisions?: { id: string; title: string; href: string; decideBy: string }[];
  revisits?: { id: string; title: string; href: string; revisitOn: string }[];
}): DueItem[] {
```

After the `...(input.decisions ?? []).map(…)` line inside the `items` array, add:

```ts
    ...(input.revisits ?? []).map((r): DueItem => ({ key: `revisit:${r.id}`, kind: "revisit", id: r.id, text: `What happened after: ${r.title}?`, due: r.revisitOn, week: null, href: r.href })),
```

- [ ] **Step 4: Home's reason**

In `web/src/core/home.ts`, replace the `reason:` line inside the `if (late) return { kind: "overdue", … }` block with:

```ts
      reason:
        late.kind === "decision"
          ? `It's ${dueWords(late, input.today)}. Make the call or change its decide-by date.`
          : late.kind === "revisit"
            ? `It's ${dueWords(late, input.today)}. Say what happened, in a line.`
            : `It's ${dueWords(late, input.today)}. Finish it, or drop it with a reason.`,
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd web && pnpm test src/core/due.test.ts src/core/home.test.ts`
Expected: PASS, all tests in both files.

- [ ] **Step 6: Commit**

```bash
git add web/src/core/due.ts web/src/core/home.ts web/src/core/due.test.ts web/src/core/home.test.ts
git commit -m "feat: a revisit is a due item, and Home asks what happened when its date has passed"
```

---

### Task 3: `loadToday` finds the revisits and Home links to them

**Files:**
- Modify: `web/src/commands/today.ts` (the decision rows block and the `buildDueItems` call)
- Modify: `web/src/components/home/DueList.tsx`
- Test: `web/src/commands/today.test.ts`

**Interfaces:**
- Consumes: `dueItems({ …, revisits })` (Task 2).
- Produces: `loadToday()`'s `dueItems` includes `kind: "revisit"` items; a shared `decisionHref(index, rel)` helper inside `loadToday` used by both the decide-by and revisit rows.

- [ ] **Step 1: Write the failing test**

In `web/src/commands/today.test.ts`, after the test `"links a due decision to its actual page and ignores imported open questions"`, add:

```ts
  it("asks what happened after a decided decision once its revisit date has come, never for an open, imported or revisited one", async () => {
    await mkdir(path.join(env.dir, "decisions"), { recursive: true });
    const decided = (name: string, extra: string) =>
      writeFile(path.join(env.dir, `decisions/2026-10-01-${name}.md`), `---\ntitle: ${name}\ndate: 2026-10-01\ndecision: Continue\nwhy: Evidence\nreversible: true\n${extra}---\n`);
    await decided("today", "revisitOn: 2026-10-13\n");
    await decided("past", "revisitOn: 2026-10-10\n");
    await decided("later", "revisitOn: 2026-10-14\n");
    await decided("done", "revisitOn: 2026-10-10\nrevisitedOn: 2026-10-12\n");
    await decided("imported", "revisitOn: 2026-10-10\nseeded: true\nsource: notes\n");
    await writeFile(path.join(env.dir, "decisions/2026-10-02-open.md"), "---\ntitle: open\ndate: 2026-10-02\nstatus: open\n---\n");
    const revisits = (await ready()).dueItems.filter((item) => item.kind === "revisit");
    expect(revisits.map((r) => [r.text, r.due, r.href])).toEqual([
      ["What happened after: past?", "2026-10-10", "/decisions#2026-10-01-past"],
      ["What happened after: today?", "2026-10-13", "/decisions#2026-10-01-today"],
    ]);
  });
```

(The fixture pins `today: 2026-10-13`, so "today" is due, "past" is from before, "later" is not yet.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && pnpm test src/commands/today.test.ts`
Expected: FAIL with `expected [] to deeply equal [ [ 'What happened after: past?', … ] ]`.

- [ ] **Step 3: Find the revisits**

In `web/src/commands/today.ts`, replace the block from `const openDecisions = decisionRows.flatMap((entry, index) => {` through its closing `});` with:

```ts
  // Decisions are paginated newest first, so a link lands on the page the record is on.
  const decisionHref = (index: number, rel: string) => {
    const page = Math.floor(index / PAGE_SIZE) + 1;
    return `/decisions${page > 1 ? `?page=${page}` : ""}#${slugOf(rel)}`;
  };
  const openDecisions = decisionRows.flatMap((entry, index) => {
    if (entry.data.seeded || entry.data.status !== "open" || !entry.data.decideBy || entry.data.decideBy > decisionHorizon) return [];
    return [{ id: entry.path, title: entry.data.title, decideBy: entry.data.decideBy, href: decisionHref(index, entry.path) }];
  });
  // A decided decision whose revisit date has come and that has no outcome yet. Never before the date, never an import.
  const revisits = decisionRows.flatMap((entry, index) => {
    const d = entry.data;
    if (d.seeded || d.status !== "decided" || !d.revisitOn || d.revisitOn > today || d.revisitedOn) return [];
    return [{ id: entry.path, title: d.title, href: decisionHref(index, entry.path), revisitOn: d.revisitOn }];
  });
```

Change the `buildDueItems` call to:

```ts
  const dueList = buildDueItems({ commitments: ranked, homework, followUps, decisions: openDecisions, revisits });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && pnpm test src/commands/today.test.ts`
Expected: PASS, all tests in the file (the existing decide-by test still gets `/decisions?page=2#2026-10-01-who-pays`).

- [ ] **Step 5: Home's due list links a revisit to the card**

In `web/src/components/home/DueList.tsx`:

Change the first line of `doneAction` to:

```ts
  if (i.kind === "decision" || i.kind === "revisit") return null;
```

Change the doc comment above `doneAction` to:

```ts
/** What Done sends for each kind of item: a commitment to its own week's check-in, homework to its program week, a follow-up to its conversation. A decision and a revisit have no Done here; they link to the decision's card. */
```

Replace the `<Link href={i.href ?? "/decisions"} …>Decide</Link>` element with:

```tsx
                  <Link href={i.href ?? "/decisions"} className={i.key === primaryKey ? buttonPrimary : buttonQuiet}>
                    {i.kind === "revisit" ? "Say what happened" : "Decide"}
                  </Link>
```

- [ ] **Step 6: Lint and typecheck**

Run: `cd web && pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/commands/today.ts web/src/commands/today.test.ts web/src/components/home/DueList.tsx
git commit -m "feat: Home lists decisions whose revisit date has come"
```

---

### Task 4: The decision command takes a revisit date and records an outcome

**Files:**
- Modify: `web/src/commands/decisions.ts` (`DecisionInput`, `parseDecisionForm`, `resolveDecision`; new `recordOutcome`)
- Modify: `web/src/app/(workbook)/decisions/actions.ts`
- Test: `web/src/commands/decisions.test.ts`

**Interfaces:**
- Consumes: `required`, `isRealDate`, `orNull` from `web/src/commands/form.ts`; `updateEntry` from `web/src/store/update.ts`; `loadFounderToday()` from `web/src/commands/today.ts` (returns the pinned or real `YYYY-MM-DD`).
- Produces:
  - `DecisionInput.revisitOn: string | null`
  - `parseDecisionForm` reads `revisitOn`; `errors.revisitOn` is `Use a real revisit date.`, `Pick a revisit date after the decision's date.`, or the open-conflict message
  - `resolveDecision(path, { decision, why, reversible, revisitOn })`, `revisitOn` may be `""`
  - `recordOutcome(path: string, text: string, today: string): Promise<void>`
  - `recordOutcomeAction(prev, fd)` reading `path` and `outcome`

- [ ] **Step 1: Write the failing tests**

In `web/src/commands/decisions.test.ts`:

Change the node import to `import { mkdir, readFile, writeFile } from "node:fs/promises";` and the decisions import to `import { createDecision, loadDecisions, parseDecisionForm, recordOutcome, resolveDecision } from "./decisions";`.

Inside `describe("decision log", …)`, after the test `"a broken against link is a warning on the decision, like evidence"`, add:

```ts
  it("keeps a revisit date on a decided record only, on or after the decision's date", async () => {
    const before = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no", revisitOn: "2026-10-01" }));
    expect(!before.ok && before.errors).toEqual({ revisitOn: "Pick a revisit date after the decision's date." });
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
  it("refuses an outcome on an open question or a decision without a revisit date", async () => {
    const open = parseDecisionForm(form({ title: "Who pays?", date: "2026-10-15", status: "open" }));
    if (!open.ok) throw new Error("fixture invalid");
    await expect(recordOutcome(await createDecision(open.input), "x", "2026-10-21")).rejects.toThrow(/Decide it first/);
    const plain = parseDecisionForm(form({ title: "X", date: "2026-10-09", decision: "Y", why: "Z", reversible: "no" }));
    if (!plain.ok) throw new Error("fixture invalid");
    await expect(recordOutcome(await createDecision(plain.input), "x", "2026-10-21")).rejects.toThrow(/no revisit date/);
  });
```

The existing test `"parks an open question and resolves the same file in place"` calls `resolveDecision(rel, { decision, why, reversible: "yes" })`; add `revisitOn: ""` to that object so it typechecks.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/commands/decisions.test.ts`
Expected: FAIL. `recordOutcome` is not exported; the first new test gets `{}` errors instead of the revisit error.

- [ ] **Step 3: The command**

In `web/src/commands/decisions.ts`:

Change the form import to:

```ts
import { all, isRealDate, lines, oneOf, orNull, required, text, type Parsed } from "./form";
```

In `DecisionInput`, after `relatedTest: string | null;` add:

```ts
  revisitOn: string | null; // the day Home asks what happened; decided records only
```

In `parseDecisionForm`, add `"revisitOn"` to the end of the list of text keys, so the line reads:

```ts
  for (const k of ["title", "date", "status", "decideBy", "area", "beliefBefore", "alternatives", "decision", "why", "reversible", "relatedTest", "revisitOn"]) values[k] = text(fd, k);
```

After the line `if (values.area && !oneOf(AREAS, values.area)) errors.area = …;` add:

```ts
  if (values.revisitOn && !isRealDate(values.revisitOn)) errors.revisitOn = "Use a real revisit date.";
  else if (values.revisitOn && isRealDate(values.date) && values.revisitOn < values.date) errors.revisitOn = "Pick a revisit date after the decision's date.";
```

After the line `if (values.status === "open" && values.reversible) errors.reversible = openConflict;` add:

```ts
  if (values.status === "open" && values.revisitOn) errors.revisitOn = openConflict;
```

In the returned `input`, after `relatedTest: orNull(values.relatedTest),` add:

```ts
      revisitOn: values.status === "decided" ? orNull(values.revisitOn) : null,
```

Replace `resolveDecision` (and its doc comment) with:

```ts
/** Resolves an open question in place so its original date, alternatives and evidence stay together. A revisit date is optional. */
export async function resolveDecision(path: string, input: { decision: string; why: string; reversible: string; revisitOn: string }): Promise<void> {
  const decision = input.decision.trim();
  const why = input.why.trim();
  const revisitOn = input.revisitOn.trim();
  if (!decision) throw new Error("Say what you decided.");
  if (!why) throw new Error("Say why. Future you will want to know.");
  if (input.reversible !== "yes" && input.reversible !== "no") throw new Error("Say whether this is easy to undo.");
  if (revisitOn && !isRealDate(revisitOn)) throw new Error("Use a real revisit date.");
  await updateEntry("decision", path, (data, body) => {
    if (!data) throw new Error("That decision no longer exists. Reload the page.");
    if (data.status !== "open") throw new Error("That question has already been decided. Reload the page.");
    if (revisitOn && revisitOn < data.date) throw new Error("Pick a revisit date after the decision's date.");
    return { data: { ...data, status: "decided", decision, why, reversible: input.reversible === "yes", ...(revisitOn ? { revisitOn } : {}) }, body };
  });
}

/**
 * Closes the loop: the founder says what came of a decided decision. Appends `## Outcome` below whatever the body
 * holds and records the day. Once per decision; the founder's words only.
 */
export async function recordOutcome(path: string, text: string, today: string): Promise<void> {
  const outcome = required(text, "Say what happened, even if it's “nothing yet”.");
  if (!isRealDate(today)) throw new Error("Use a real date.");
  await updateEntry("decision", path, (data, body) => {
    if (!data) throw new Error("That decision no longer exists. Reload the page.");
    if (data.status !== "decided") throw new Error("An open question has no outcome yet. Decide it first.");
    if (!data.revisitOn) throw new Error("This decision has no revisit date. Reload the page.");
    if (data.revisitedOn) throw new Error("That decision has already been revisited. Reload the page.");
    const kept = body.replace(/\s+$/, "");
    return { data: { ...data, revisitedOn: today }, body: `${kept ? `${kept}\n\n` : ""}## Outcome\n\n${outcome}\n` };
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && pnpm test src/commands/decisions.test.ts`
Expected: PASS, all tests in the file. If the body assertion in `"records what happened once…"` fails only on leading or trailing whitespace, the writer normalises the body; adjust the `kept` logic so the result still reads `## Why in full … ## Outcome …` with one blank line between sections, and keep the `.trim()` assertion.

- [ ] **Step 5: The actions**

Replace the whole of `web/src/app/(workbook)/decisions/actions.ts` with:

```ts
"use server";

import { createDecision, parseDecisionForm, recordOutcome, resolveDecision } from "@/commands/decisions";
import { isRealDate } from "@/commands/form";
import { loadFounderToday } from "@/commands/today";
import type { ActionState } from "@/lib/action-state";
import { field, run } from "../action-utils";

export async function createDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseDecisionForm(fd);
  if (!parsed.ok) return { status: "error", message: "Check the highlighted answers.", errors: parsed.errors, values: parsed.values };
  return run(() => createDecision(parsed.input), parsed.values);
}

export async function resolveDecisionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { decision: field(fd, "decision"), why: field(fd, "why"), reversible: field(fd, "reversible"), revisitOn: field(fd, "revisitOn") };
  const errors: Record<string, string> = {};
  if (!values.decision.trim()) errors.decision = "Say what you decided.";
  if (!values.why.trim()) errors.why = "Say why. Future you will want to know.";
  if (values.reversible !== "yes" && values.reversible !== "no") errors.reversible = "Say whether this is easy to undo.";
  if (values.revisitOn && !isRealDate(values.revisitOn)) errors.revisitOn = "Use a real revisit date.";
  if (Object.keys(errors).length > 0) return { status: "error", message: "Check the highlighted answers.", errors, values };
  return run(() => resolveDecision(field(fd, "path"), values), values);
}

/** The founder's own words on what came of a decision. The date is the app's today (the founder's pin, if set), never the form's. */
export async function recordOutcomeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { outcome: field(fd, "outcome") };
  return run(async () => recordOutcome(field(fd, "path"), values.outcome, await loadFounderToday()), values);
}
```

- [ ] **Step 6: Lint and typecheck**

Run: `cd web && pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors. (`ResolveDecisionForm` still posts no `revisitOn`; `field()` returns `""` for a missing key, which `resolveDecision` accepts. Task 5 adds the field.)

- [ ] **Step 7: Commit**

```bash
git add web/src/commands/decisions.ts web/src/commands/decisions.test.ts "web/src/app/(workbook)/decisions/actions.ts"
git commit -m "feat: a decision takes a revisit date and records what happened"
```

---

### Task 5: The date field, the outcome form and the card

**Files:**
- Modify: `web/src/components/decisions/DecisionForm.tsx`
- Modify: `web/src/components/decisions/ResolveDecisionForm.tsx`
- Create: `web/src/components/decisions/OutcomeForm.tsx`
- Modify: `web/src/app/(workbook)/decisions/page.tsx`

**Interfaces:**
- Consumes: `recordOutcomeAction` (Task 4); `radioChip` from `web/src/components/workbook/form.ts`; `Field`, `describedBy`, `FormAlert` from `web/src/components/workbook/Field.tsx`; `d.revisitOn`, `d.revisitedOn` (Task 1).
- Produces: `OutcomeForm({ path })`; `DecisionCard({ row, labels, today })`.

- [ ] **Step 1: The date field on the create form**

In `web/src/components/decisions/DecisionForm.tsx`, after the `</fieldset>` that closes the "Can you undo it easily?" fieldset and before `{evidenceOptions.length > 0 && (`, add:

```tsx
      <Field id="revisitOn" label="Revisit on (optional)" hint="The day Home asks what happened." error={err.revisitOn}>
        <input id="revisitOn" name="revisitOn" type="date" defaultValue={v.revisitOn} className={inputClass} aria-invalid={!!err.revisitOn} aria-describedby={describedBy("revisitOn", err.revisitOn, "The day Home asks what happened.")} />
      </Field>
```

- [ ] **Step 2: The date field on the resolve form**

Replace the whole of `web/src/components/decisions/ResolveDecisionForm.tsx` with:

```tsx
"use client";

import { useActionState } from "react";
import { resolveDecisionAction } from "@/app/(workbook)/decisions/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, errorText, inputClass, radioChip } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

export function ResolveDecisionForm({ path }: { path: string }) {
  const [state, action, pending] = useActionState(resolveDecisionAction, IDLE);
  const values = state.values ?? {};
  const errors = state.errors ?? {};
  return (
    <form action={action} className="mt-4 space-y-4 border-t border-line pt-4" noValidate>
      <input type="hidden" name="path" value={path} />
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <Field id={`${path}-decision`} label="What did you decide?" error={errors.decision}>
        <textarea id={`${path}-decision`} name="decision" rows={2} defaultValue={values.decision} className={inputClass} aria-invalid={!!errors.decision} aria-describedby={describedBy(`${path}-decision`, errors.decision)} />
      </Field>
      <Field id={`${path}-why`} label="Why?" error={errors.why}>
        <textarea id={`${path}-why`} name="why" rows={2} defaultValue={values.why} className={inputClass} aria-invalid={!!errors.why} aria-describedby={describedBy(`${path}-why`, errors.why)} />
      </Field>
      <fieldset aria-describedby={errors.reversible ? `${path}-reversible-error` : undefined}>
        <legend className="mb-1 text-sm font-medium text-ink">Can you undo it easily?</legend>
        <div className="flex flex-wrap gap-2">
          {[["yes", "Yes, easy to undo"], ["no", "No, hard to undo"]].map(([value, label]) => (
            <label key={value} className={radioChip}><input type="radio" name="reversible" value={value} defaultChecked={values.reversible === value} /> {label}</label>
          ))}
        </div>
        {errors.reversible && <p id={`${path}-reversible-error`} className={errorText}>{errors.reversible}</p>}
      </fieldset>
      <Field id={`${path}-revisitOn`} label="Revisit on (optional)" hint="The day Home asks what happened." error={errors.revisitOn}>
        <input id={`${path}-revisitOn`} name="revisitOn" type="date" defaultValue={values.revisitOn} className={inputClass} aria-invalid={!!errors.revisitOn} aria-describedby={describedBy(`${path}-revisitOn`, errors.revisitOn, "The day Home asks what happened.")} />
      </Field>
      <button type="submit" disabled={pending} className={buttonPrimary}>{pending ? "Saving…" : "Save decision"}</button>
    </form>
  );
}
```

(The local `chip` constant is gone; `radioChip` is the shared one.)

- [ ] **Step 3: The outcome form**

Create `web/src/components/decisions/OutcomeForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { recordOutcomeAction } from "@/app/(workbook)/decisions/actions";
import { Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";

/**
 * Closes the loop on a decided decision once its revisit date has come: what happened, in the founder's words. While
 * it shows, it is the card's one primary action. The date is the app's today, set on the server.
 */
export function OutcomeForm({ path }: { path: string }) {
  const [state, action, pending] = useActionState(recordOutcomeAction, IDLE);
  const id = `${path}-outcome`;
  return (
    <form action={action} className="mt-4 space-y-3 border-t border-line pt-4" noValidate>
      <input type="hidden" name="path" value={path} />
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      <Field id={id} label="What happened?">
        <textarea id={id} name="outcome" rows={3} defaultValue={state.values?.outcome} placeholder="Two of the five agencies signed; the third said the price was the problem, not the tool." className={inputClass} />
      </Field>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Record what happened"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: The card**

In `web/src/app/(workbook)/decisions/page.tsx`:

Add the import after the `ResolveDecisionForm` import:

```ts
import { OutcomeForm } from "@/components/decisions/OutcomeForm";
```

Change the card call in `DecisionsContent` to pass today:

```tsx
              <DecisionCard row={r} labels={labels} today={today} />
```

Change the `DecisionCard` signature to:

```tsx
function DecisionCard({ row, labels, today }: { row: DecisionRow; labels: Map<string, string>; today: string }) {
  const d = row.data;
  // The loop is open once the revisit date has come and nothing has been recorded. The form shows only then.
  const revisitDue = d.status === "decided" && !!d.revisitOn && !d.revisitedOn && d.revisitOn <= today;
```

In the header `div` (the one with the title, date and badges), after the `{d.status === "open" ? <Badge …> : <Badge …>}` line, add:

```tsx
        {d.status === "decided" && d.revisitOn && !d.revisitedOn && <span className="text-sm text-muted">Revisit on {formatDate(d.revisitOn)}</span>}
        {d.revisitedOn && <span className="text-sm text-muted">Revisited {formatDate(d.revisitedOn)}</span>}
```

Replace the last line inside the `<article>`, `{d.status === "open" && <ResolveDecisionForm path={row.path} />}`, with:

```tsx
      {d.status === "open" && <ResolveDecisionForm path={row.path} />}
      {revisitDue && <OutcomeForm path={row.path} />}
```

- [ ] **Step 5: Lint, typecheck, full suite**

Run: `cd web && pnpm lint && pnpm exec tsc --noEmit && pnpm test`
Expected: no lint or type errors; every test passes.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/decisions/DecisionForm.tsx web/src/components/decisions/ResolveDecisionForm.tsx web/src/components/decisions/OutcomeForm.tsx "web/src/app/(workbook)/decisions/page.tsx"
git commit -m "feat: set a revisit date when deciding, and record what happened on the card"
```

---

### Task 6: Agent instructions

**Files:**
- Modify: `AGENTS.md` (step 4 of "At the start of every conversation", "What you write, and where", "What you don't write", the decision row of "File kinds")

No code. Every replacement quotes the existing text; insert the new text exactly.

- [ ] **Step 1: What's due**

In item 4 under "At the start of every conversation", replace:

```
It holds open commitments (this week's and carried), program homework, follow-ups (`kind: followup`) and open decisions (`kind: decision`) due; say each one once.
```

with:

```
It holds open commitments (this week's and carried), program homework, follow-ups (`kind: followup`), open decisions (`kind: decision`) due, and decided decisions whose revisit date has come (`kind: revisit`; say "What happened after: <title>? from <date>"); say each one once.
```

- [ ] **Step 2: What you write**

Under "What you write, and where", after the bullet that begins `- **An unresolved question that needs a call**`, add:

```
- **What happened after a decision** → when the founder says what came of a decided decision, write their words under `## Outcome` in that decision's body and set `revisitedOn` to today. Never write an outcome they didn't give. Set `revisitOn` only when they name the day they want to come back.
```

- [ ] **Step 3: What you don't write**

Under "What you don't write", after the bullet about a conversation's `stance`, add:

```
- A revisit date the founder didn't name, or an outcome they didn't say.
```

- [ ] **Step 4: The file-kind row**

In the `decisions/YYYY-MM-DD-slug.md` row, replace `relatedTest?. Open records omit decision/why/reversible; decided records require them |` with:

```
relatedTest?, revisitOn? (only when decided; the day Home asks what happened), revisitedOn? (only with revisitOn; the day the outcome was written under `## Outcome` in the body). Open records omit decision/why/reversible/revisitOn/revisitedOn; decided records require decision/why/reversible |
```

- [ ] **Step 5: Verify and commit**

Run from the repo root: `grep -n "revisit" AGENTS.md` shows the four places; `git diff --stat` shows only `AGENTS.md`; the table row is still one line.

```bash
git add AGENTS.md
git commit -m "docs: the agent lists revisits and writes an outcome only in the founder's words"
```

---

### Task 7: Full check and a dry run on scratch data

Never use the founder's real data (`~/Founderive/Intraview`). Next refuses a second dev server in the same folder, so the running app must be stopped first, with Britt's OK, and restarted afterwards with plain `node start.mjs`. If no browser is connected, read pages as rendered HTML (fetch and strip tags) and make the writes through the app's commands with a small `.mts` run by `pnpm exec tsx` under `FOUNDER_DATA_DIR`.

- [ ] **Step 1: Everything green**

Run from `web/`:

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm test
```

Expected: no lint errors, no type errors, every test passes.

- [ ] **Step 2: Scratch data**

Copy `web/test-data` to a scratch folder, drop `program/`, and keep the `today: 2026-10-13` pin (the dates below rely on it). Add two decided decisions:

```bash
S=<scratch folder>
cat > "$S/decisions/2026-10-01-only-spreadsheets.md" <<'EOF'
---
title: Only agencies still on spreadsheets
date: 2026-10-01
decision: Talk only to agencies still on spreadsheets
why: A bought tool removes the pain
reversible: true
revisitOn: 2026-10-10
---
EOF
cat > "$S/decisions/2026-10-05-price-ceiling.md" <<'EOF'
---
title: Hold the price at $300
date: 2026-10-05
decision: Keep the pilot at $300 a month
why: Nobody has pushed back yet
reversible: true
revisitOn: 2026-10-20
---
EOF
cd web && FOUNDER_DATA_DIR="$S" pnpm -s check-data
```

Expected: no errors.

- [ ] **Step 3: Start against the scratch folder**

Ask Britt before stopping the running app. Then, from the repo root: `FOUNDER_DATA_DIR=$S node start.mjs`. Confirm the start log's "Your data:" line names the scratch folder.

- [ ] **Step 4: Walk the states**

1. Home: Due lists "What happened after: Only agencies still on spreadsheets?" with "from Oct 10" and a "Say what happened" link. The main action is that line with the reason "It's from Oct 10. Say what happened, in a line." (the fixture has no older past-due item; if it does, the oldest wins, as the rule says). The $300 decision is not listed.
2. Decisions: the first card shows "Revisit on Oct 10" and the "What happened?" form with "Record what happened"; the second shows "Revisit on Oct 20" and no form. The create form has "Revisit on (optional)" after "Can you undo it easily?".
3. Submit the form empty: "Say what happened, even if it's 'nothing yet'." Submit "Two of five signed.": the card shows an "Outcome" section with that text, "Revisited Oct 13", and no form. Home no longer lists it.
4. Create a decided decision with a revisit date before its date: "Pick a revisit date after the decision's date." with the input kept. Create an open question with a revisit date: the open-conflict message. Resolve an open question with a revisit date: the card shows "Revisit on <date>".
5. `FOUNDER_DATA_DIR=$S pnpm -s check-data` from `web/`: no errors, no warnings. The outcome file has `revisitedOn: 2026-10-13` and `## Outcome` after the frontmatter.
6. `FOUNDER_DATA_DIR=$S pnpm -s today --json` from `web/`: `dueItems` holds no revisit any more; before step 3 it held one with `kind: "revisit"`.

- [ ] **Step 5: Restore the app**

Stop the scratch instance and start the app again with plain `node start.mjs`. Confirm "Your data:" names the founder's own folder.

- [ ] **Step 6: Record what was verified**

Add a section `## What was verified (<date>)` to `docs/product/close-the-loop-direction.md` under the first paragraph, listing the six checks with the result of each in one line, and anything that didn't match the brief.

```bash
git add docs/product/close-the-loop-direction.md
git commit -m "docs: close the loop dry run result"
```

---

## Self-review

**Spec coverage.** The two fields, decided-only, `revisitedOn` needs `revisitOn`, older records untouched (Task 1). Setting the date on both forms, blank means nothing, before-the-date refused with input kept, open question refused with the open-conflict message, "Revisit on <date>" on the card (Tasks 4, 5). Home: the `revisit` kind, text, due words, link to the card, ordinary ranking so it can be the main action with its own reason, not before the date, not when imported or revisited, carried by `pnpm today --json` (Tasks 2, 3). The outcome form only when due, empty refused with the exact message, `revisitedOn` plus `## Outcome` appended without touching other sections, "Revisited <date>", form gone, stale-tab guards (Tasks 4, 5). An unreadable decision is already left out by `listEntries` filtering `ok` and listed in Files to fix. Agent instructions: file-kind row, what you write, what you don't write, step 4 (Task 6). The brief's Code list: every file named is touched. The brief's Tests list: schema (Task 1), `dueItems` (Task 2 for shape and order, Task 3 for the date gate), `parseDecisionForm`, `resolveDecision`, `recordOutcome` (Task 4), `loadToday` (Task 3), Home (Task 2).

**Decided here, not in the brief.** `recordOutcome` does not refuse an outcome recorded before the revisit date; the page never shows the form before then, and a founder who tells the agent early shouldn't be refused. The outcome's date comes from `loadFounderToday()` on the server, never the form. `ResolveDecisionForm` moves to the shared `radioChip` while it is being edited.

**Placeholder scan.** No TBDs; every code step shows the code; every test step shows the test and the command.

**Type consistency.** `revisits?: { id; title; href; revisitOn }[]` in Task 2's `dueItems` matches what Task 3 builds. `resolveDecision`'s input gains `revisitOn: string` in Task 4 and the action passes `values` with that key; the existing test adds `revisitOn: ""`. `recordOutcome(path, text, today)` in Task 4 is what `recordOutcomeAction` calls. `OutcomeForm({ path })` in Task 5 is what the card renders. `DecisionCard` takes `today: string` and the content passes the `today` it already loads.
