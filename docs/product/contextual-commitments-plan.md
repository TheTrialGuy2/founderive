# Contextual Commitments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A commitment made on a conversation or decision carries that record's path in `link`; Home shows "From conversation with Dana" under it, and the conversation, decision and test pages list the commitments made because of them.

**Architecture:** No schema change: `commitment.link` already takes any string, and this plan gives three values a meaning (a founder-data path under `conversations/`, `decisions/` or `tests/`). One pure module (`core/commitment-source.ts`) recognises those links and formats labels. One read module (`commands/commitment-sources.ts`) resolves links to labels and hrefs in one batch, and groups every check-in's linked commitments by link. One guarded write (`commands/commitments.ts`, `addLinkedCommitment`) checks the source exists and reads before calling the existing `addCommitment()`. `DueItem` gains an optional `source`; `loadToday()` fills it. Two components: a quiet disclosure form and a read-only list. Ranking (`core/next-step.ts`) does not change; tests lock that in. Steps are not a source (decided 2026-10-20).

**Tech Stack:** Next 16 (Cache Components, `await connection()` inside `<Suspense>`), React 19 (`useActionState`), TypeScript, Zod 4 schemas in `web/src/store/schemas.ts`, Vitest (`pnpm test` from `web/`), pnpm.

Spec: `docs/product/contextual-commitments-direction.md`. Read it first.

## Global Constraints

- Everything under `web/` runs from `web/`: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm -s check-data`. Run a single file with `pnpm test -- src/core/due.test.ts`.
- `web/src/store/` is the only code that reads or writes founder-data. Core modules are pure and take records as arguments. Commands read through `store/read.ts` (`readEntry`, `listEntries`, `existingPaths`).
- A contextual source is exactly one of: a `conversations/YYYY-MM-DD-slug.md`, `decisions/YYYY-MM-DD-slug.md` or `tests/YYYY-MM-DD-slug.md` path, as `kindOf()` in `store/schemas.ts` recognises them. `guide:<id>`, `step:<id>`, `program/…`, traversal and absolute paths are never a source. No reverse field is written on the source record.
- Ranking does not change. A conversation- or decision-linked commitment is an ordinary commitment (tier 6; tier 4 when overdue). A test-linked commitment stays at tier 7. `core/next-step.ts` is not edited.
- `DueItem.href` keeps its meaning (where the item itself lives). The source goes in a separate `source` field.
- The form shows only on a record the founder has confirmed (`seeded` absent). The list shows wherever there is at least one linked commitment, and renders nothing otherwise: no empty card, no "No commitments yet".
- Status changes stay on Home. The lists on records are read-only.
- Exact copy, used verbatim:
  - Labels: `From conversation with <person>`, `From decision: <title>`, `From test: <title>`.
  - Form summary: `Make a commitment`. Text field label: `What will you do?`, placeholder: `Send Dana the pilot outline`. Hint: `It's added to this week on Home, linked to this conversation.` or `… linked to this decision.` Date field label: `Due (optional)`. Button: `Save commitment`; pending: `Saving…`; success: `Commitment saved`.
  - Errors: empty text `Write what you'll do.`; bad date `Use a real date.`; unknown link `The commitment wasn't saved because this record isn't one Founderive can link to. Reload the page.`; missing source `The commitment wasn't saved because this record is no longer there. Reload the page.`; unreadable source `The commitment wasn't saved because this record needs repair. Fix the flagged file and try again.`; imported source `The commitment wasn't saved because this record is still an import. Confirm it first.`
  - List: closed disclosure `Done or dropped · N`; items `Done: <text>` and `Dropped: <text> · <reason>`.
  - check-data warning: `commitments: "<id>" links to <path>, which isn't in founder-data. Fix the link or remove it.`
- Links navigate and buttons act. The form is secondary everywhere: `buttonQuiet`, never `buttonPrimary`. Meaning never relies on colour alone. Client components start with `"use client"`.
- Dates are `YYYY-MM-DD`. The fixture in `web/test-data` pins `today: 2026-10-13` (2026-W42); its check-in has `c-1` (open, due 2026-10-12) and `c-2` (done); its conversation is `conversations/2026-10-08-dana-ortiz.md` (person `Dana Ortiz`); its decision is `decisions/2026-10-09-focus-on-small-agencies.md` (title `Focus on agencies with 10-50 caregivers`); its test is `tests/2026-10-06-paid-pilot.md` (running, title `Ask agency owners to pay for a scheduling pilot`). `useTempData()` copies it.
- Commit after every task. Branch: `feat/contextual-commitments` (already exists, holds the brief).
- No React rendering tests exist in this codebase. Components are checked by `pnpm lint`, `pnpm exec tsc --noEmit` and the dry run in Task 11. Behaviour lives in core and commands, which are tested.

---

### Task 1: Recognise a source link and name it

**Files:**
- Create: `web/src/core/commitment-source.ts`
- Test: `web/src/core/commitment-source.test.ts`

**Interfaces:**
- Consumes: `kindOf(rel): Kind | null` from `web/src/store/schemas.ts`; `dueWords` is not needed here.
- Produces:
  - `type SourceKind = "conversation" | "test" | "decision"`
  - `type CommitmentSource = { label: string; href: string }`
  - `type LinkedCommitment = { week: string; id: string; text: string; due: string | null; status: "open" | "done" | "dropped"; reason: string | null }`
  - `parseSourceLink(link: string | null | undefined): { kind: SourceKind; path: string } | null`
  - `sourceLabel(kind: SourceKind, name: string): string`
  - `sortLinkedCommitments(items: LinkedCommitment[]): LinkedCommitment[]`

- [ ] **Step 1: Write the failing test**

Create `web/src/core/commitment-source.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseSourceLink, sortLinkedCommitments, sourceLabel, type LinkedCommitment } from "./commitment-source";

describe("parseSourceLink", () => {
  it("recognises a conversation, test or decision path", () => {
    expect(parseSourceLink("conversations/2026-10-08-dana-ortiz.md")).toEqual({ kind: "conversation", path: "conversations/2026-10-08-dana-ortiz.md" });
    expect(parseSourceLink("tests/2026-10-06-paid-pilot.md")).toEqual({ kind: "test", path: "tests/2026-10-06-paid-pilot.md" });
    expect(parseSourceLink("decisions/2026-10-09-focus.md")).toEqual({ kind: "decision", path: "decisions/2026-10-09-focus.md" });
  });
  it("is not a guide, step, program, canvas or founder link", () => {
    for (const link of ["guide:customer", "step:customer", "program/week-05.md", "canvas/customer.md", "founder.md", "checkins/2026-W42.md"]) expect(parseSourceLink(link)).toBeNull();
  });
  it("rejects traversal, absolute paths, bare names and empty values", () => {
    for (const link of ["../conversations/2026-10-08-dana-ortiz.md", "/conversations/2026-10-08-dana-ortiz.md", "conversations/dana.md", "conversations/2026-10-08-dana-ortiz", "", null, undefined])
      expect(parseSourceLink(link)).toBeNull();
  });
});

describe("sourceLabel", () => {
  it("says where a commitment came from, in words", () => {
    expect(sourceLabel("conversation", "Dana")).toBe("From conversation with Dana");
    expect(sourceLabel("decision", "Focus on small agencies")).toBe("From decision: Focus on small agencies");
    expect(sourceLabel("test", "Paid pilot")).toBe("From test: Paid pilot");
  });
});

describe("sortLinkedCommitments", () => {
  const c = (over: Partial<LinkedCommitment>): LinkedCommitment => ({ week: "2026-W42", id: "c", text: "x", due: null, status: "open", reason: null, ...over });
  it("puts open first by due date (undated last), then newest week; closed newest week first", () => {
    const sorted = sortLinkedCommitments([
      c({ id: "done-old", status: "done", week: "2026-W40" }),
      c({ id: "open-undated-new", week: "2026-W42" }),
      c({ id: "open-fri", due: "2026-10-16" }),
      c({ id: "dropped-new", status: "dropped", week: "2026-W42", reason: "Changed plan" }),
      c({ id: "open-undated-old", week: "2026-W41" }),
      c({ id: "open-mon", due: "2026-10-12", week: "2026-W41" }),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(["open-mon", "open-fri", "open-undated-new", "open-undated-old", "dropped-new", "done-old"]);
  });
  it("does not change its input", () => {
    const input = [c({ id: "b", status: "done" }), c({ id: "a" })];
    sortLinkedCommitments(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/core/commitment-source.test.ts`
Expected: FAIL, `Failed to resolve import "./commitment-source"`.

- [ ] **Step 3: Write the module**

Create `web/src/core/commitment-source.ts`:

```ts
import { kindOf } from "../store/schemas";

/** The record kinds a commitment can come from. Steps are not one (they have `step:` and `guide:` links of their own). */
export type SourceKind = "conversation" | "test" | "decision";
/** What Home shows under a linked commitment: the words and where they go. */
export type CommitmentSource = { label: string; href: string };
/** A commitment as a source record lists it: the check-in week it lives in, and its own fields. */
export type LinkedCommitment = { week: string; id: string; text: string; due: string | null; status: "open" | "done" | "dropped"; reason: string | null };

const SOURCE_KINDS: readonly SourceKind[] = ["conversation", "test", "decision"];
const LAST = "9999-12-31";

/**
 * A commitment link that names a source record: a conversations/, tests/ or decisions/ path exactly as the file is
 * named. Anything else (guide:, step:, program/, traversal, absolute paths) is null and gets no source treatment.
 */
export function parseSourceLink(link: string | null | undefined): { kind: SourceKind; path: string } | null {
  if (!link || link.startsWith("/") || link.includes("..")) return null;
  const kind = kindOf(link);
  return kind && (SOURCE_KINDS as readonly string[]).includes(kind) ? { kind: kind as SourceKind, path: link } : null;
}

/** "From conversation with Dana", "From decision: <title>", "From test: <title>". */
export function sourceLabel(kind: SourceKind, name: string): string {
  if (kind === "conversation") return `From conversation with ${name}`;
  return `From ${kind}: ${name}`;
}

/** Open first (soonest due, undated last, then newest week), then done and dropped newest week first. Returns a copy. */
export function sortLinkedCommitments(items: LinkedCommitment[]): LinkedCommitment[] {
  const open = items.filter((c) => c.status === "open").sort((a, b) => (a.due ?? LAST).localeCompare(b.due ?? LAST) || b.week.localeCompare(a.week));
  const closed = items.filter((c) => c.status !== "open").sort((a, b) => b.week.localeCompare(a.week));
  return [...open, ...closed];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/core/commitment-source.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/commitment-source.ts web/src/core/commitment-source.test.ts
git commit -m "feat: recognise a commitment's source link and name it"
```

---

### Task 2: Carry a source on a due item; lock the ranking

**Files:**
- Modify: `web/src/core/due.ts` (the `DueItem` type and `dueItems()`)
- Test: `web/src/core/due.test.ts`, `web/src/core/next-step.test.ts`

**Interfaces:**
- Consumes: `CommitmentSource` from Task 1.
- Produces: `DueItem` gains `source?: CommitmentSource`. `dueItems()`'s `commitments` rows accept `link?: string | null`, and the input gains `sources?: Map<string, CommitmentSource>` keyed by link. Callers of `dueItems()`: `web/src/commands/today.ts` (as `buildDueItems`) and `web/src/core/due.test.ts`. Both keep working unchanged because the new input is optional; Task 9 passes `sources` from `today.ts`.

- [ ] **Step 1: Write the failing tests**

In `web/src/core/due.test.ts`, inside `describe("dueItems", …)`, add after the last `it`:

```ts
  it("carries a resolved source beside a linked commitment, separate from href, and leaves the order alone", () => {
    const sources = new Map([["conversations/2026-10-08-dana-ortiz.md", { label: "From conversation with Dana", href: "/conversations/2026-10-08-dana-ortiz" }]]);
    const items = dueItems({
      commitments: [
        { id: "c-1", text: "Send Dana the outline", due: "2026-10-16", status: "open", week: "2026-W42", link: "conversations/2026-10-08-dana-ortiz.md" },
        { id: "c-2", text: "Plain", due: "2026-10-14", status: "open", week: "2026-W42" },
        { id: "c-3", text: "Broken", due: "2026-10-15", status: "open", week: "2026-W42", link: "conversations/2026-01-01-gone.md" },
      ],
      homework: [],
      sources,
    });
    expect(items.map((i) => i.id)).toEqual(["c-2", "c-3", "c-1"]);
    expect(items[2]).toMatchObject({ source: { label: "From conversation with Dana", href: "/conversations/2026-10-08-dana-ortiz" } });
    expect(items[2].href).toBeUndefined();
    expect(items[0].source).toBeUndefined();
    expect(items[1].source).toBeUndefined();
  });
```

In `web/src/core/next-step.test.ts`, inside `describe("nextStep", …)`, add after the test `"done commitments don't rank; overdue ones rank at 4, open ones not yet due at 6"`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify the due one fails and the ranking one passes**

Run: `pnpm test -- src/core/due.test.ts src/core/next-step.test.ts`
Expected: the new `due.test.ts` case FAILS (`source` is undefined, and TypeScript complains about `link`/`sources`); the `next-step.test.ts` case PASSES as is. Ranking is not being changed; the test only locks it.

- [ ] **Step 3: Extend `DueItem` and `dueItems()`**

In `web/src/core/due.ts`, replace the import block and the `DueItem` type:

```ts
import type { CommitmentSource } from "./commitment-source";
import { commitmentActionId } from "./next-step";
import { addDays, isoWeekId } from "./week";

/**
 * `href` is set for a follow-up (its conversation), a decision and a revisit (the decision's card). A follow-up's `id`
 * is `<conversation path>#<follow-up id>`. `source` is set on a commitment whose link names a readable conversation,
 * decision or test: where it came from, not where it lives.
 */
export type DueItem = { key: string; kind: "commitment" | "homework" | "followup" | "decision" | "revisit"; id: string; text: string; due: string | null; week: string | null; href?: string; source?: CommitmentSource };
```

Replace the `dueItems` signature and the commitments line:

```ts
export function dueItems(input: {
  commitments: { id: string; text: string; due?: string | null; status: string; week: string; link?: string | null }[];
  homework: { id: string; title: string; due?: string | null; status: string }[];
  followUps?: { id: string; text: string; href: string; due: string }[];
  decisions?: { id: string; title: string; href: string; decideBy: string }[];
  revisits?: { id: string; title: string; href: string; revisitOn: string }[];
  /** Resolved sources by commitment link (Task 9's loader fills it). A link with no entry gets no source. */
  sources?: Map<string, CommitmentSource>;
}): DueItem[] {
  const items: DueItem[] = [
    ...input.commitments
      .filter((c) => c.status === "open")
      .map((c): DueItem => {
        const source = c.link ? input.sources?.get(c.link) : undefined;
        return { key: commitmentActionId(c.id, c.week), kind: "commitment", id: c.id, text: c.text, due: c.due ?? null, week: c.week, ...(source ? { source } : {}) };
      }),
```

Leave the homework, followUps, decisions and revisits lines and the sort as they are.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/core/due.test.ts src/core/next-step.test.ts src/core/home.test.ts`
Expected: PASS. Then `pnpm exec tsc --noEmit` from `web/`: no errors (`today.ts` still compiles because `sources` is optional).

- [ ] **Step 5: Commit**

```bash
git add web/src/core/due.ts web/src/core/due.test.ts web/src/core/next-step.test.ts
git commit -m "feat: a due item carries its commitment's source; ranking locked by test"
```

---

### Task 3: One rule for the decision anchor

**Files:**
- Create: `web/src/core/decision-order.ts`
- Modify: `web/src/commands/today.ts:106-115` (the `decisionRows` sort and the local `decisionHref`), `web/src/commands/decisions.ts:131-133` (the `rows` sort)
- Test: `web/src/core/decision-order.test.ts`

**Interfaces:**
- Produces: `byNewestDecision(a, b)` comparator for `{ path: string; data: { date: string } }`, and `decisionHref(index: number, rel: string): string` returning `/decisions#<slug>` on page 1 and `/decisions?page=N#<slug>` after. `today.ts`, `decisions.ts` and Task 4's resolver all use these, so a decision link always lands on the right page.

- [ ] **Step 1: Write the failing test**

Create `web/src/core/decision-order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { byNewestDecision, decisionHref } from "./decision-order";

describe("decision order", () => {
  it("sorts newest first, then by path", () => {
    const rows = [
      { path: "decisions/2026-10-01-b.md", data: { date: "2026-10-01" } },
      { path: "decisions/2026-10-09-a.md", data: { date: "2026-10-09" } },
      { path: "decisions/2026-10-01-a.md", data: { date: "2026-10-01" } },
    ];
    expect([...rows].sort(byNewestDecision).map((r) => r.path)).toEqual(["decisions/2026-10-09-a.md", "decisions/2026-10-01-a.md", "decisions/2026-10-01-b.md"]);
  });
  it("links to the page the decision is on, newest first, ten per page", () => {
    expect(decisionHref(0, "decisions/2026-10-09-a.md")).toBe("/decisions#2026-10-09-a");
    expect(decisionHref(9, "decisions/2026-10-01-b.md")).toBe("/decisions#2026-10-01-b");
    expect(decisionHref(10, "decisions/2026-09-30-c.md")).toBe("/decisions?page=2#2026-09-30-c");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/core/decision-order.test.ts`
Expected: FAIL, `Failed to resolve import "./decision-order"`.

- [ ] **Step 3: Write the module and use it in both commands**

Create `web/src/core/decision-order.ts`:

```ts
import { PAGE_SIZE } from "../lib/pagination";
import { slugOf } from "./slug";

/** Decisions are listed newest first, ties by path. Home's links and the page must agree, so both sort with this. */
export const byNewestDecision = (a: { path: string; data: { date: string } }, b: { path: string; data: { date: string } }): number =>
  b.data.date.localeCompare(a.data.date) || a.path.localeCompare(b.path);

/** The page and card anchor of the decision at `index` in that order. */
export function decisionHref(index: number, rel: string): string {
  const page = Math.floor(index / PAGE_SIZE) + 1;
  return `/decisions${page > 1 ? `?page=${page}` : ""}#${slugOf(rel)}`;
}
```

In `web/src/commands/today.ts`:
- Add `import { byNewestDecision, decisionHref } from "../core/decision-order";` beside the other core imports.
- Remove `import { PAGE_SIZE } from "../lib/pagination";` (no other use remains in the file; confirm with `grep -n PAGE_SIZE src/commands/today.ts`).
- Replace

```ts
  const decisionRows = (await listEntries("decision"))
    .flatMap((entry) => (entry.ok ? [entry] : []))
    .sort((a, b) => b.data.date.localeCompare(a.data.date) || a.path.localeCompare(b.path));
  // Decisions are paginated newest first, so a link lands on the page the record is on.
  const decisionHref = (index: number, rel: string) => {
    const page = Math.floor(index / PAGE_SIZE) + 1;
    return `/decisions${page > 1 ? `?page=${page}` : ""}#${slugOf(rel)}`;
  };
```

with

```ts
  // Decisions are paginated newest first, so a link lands on the page the record is on (core/decision-order).
  const decisionRows = (await listEntries("decision")).flatMap((entry) => (entry.ok ? [entry] : [])).sort(byNewestDecision);
```

`slugOf` stays imported in `today.ts`; it is used elsewhere in the file.

In `web/src/commands/decisions.ts`:
- Add `import { byNewestDecision } from "../core/decision-order";`.
- Replace `.sort((a, b) => b.data.date.localeCompare(a.data.date) || a.path.localeCompare(b.path));` in `loadDecisions` with `.sort(byNewestDecision);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test -- src/core/decision-order.test.ts src/commands/today.test.ts src/commands/decisions.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; the existing test "links a due decision to its actual page" still passes; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/decision-order.ts web/src/core/decision-order.test.ts web/src/commands/today.ts web/src/commands/decisions.ts
git commit -m "refactor: one rule for decision order and the card anchor"
```

---

### Task 4: Resolve sources and group linked commitments

**Files:**
- Create: `web/src/commands/commitment-sources.ts`
- Test: `web/src/commands/commitment-sources.test.ts`

**Interfaces:**
- Consumes: `parseSourceLink`, `sourceLabel`, `sortLinkedCommitments`, `CommitmentSource`, `LinkedCommitment` (Task 1); `byNewestDecision`, `decisionHref` (Task 3); `readEntry`, `listEntries` from `store/read.ts`; `weekOfCheckinPath` from `commands/checkin.ts`; `slugOf` from `core/slug.ts`.
- Produces:
  - `resolveCommitmentSources(links: (string | null | undefined)[]): Promise<Map<string, CommitmentSource>>`
  - `loadLinkedCommitments(): Promise<Map<string, LinkedCommitment[]>>` (keyed by link, each list already sorted)
  - `linkedCommitmentsFor(path: string): Promise<LinkedCommitment[]>`

- [ ] **Step 1: Write the failing test**

Create `web/src/commands/commitment-sources.test.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { linkedCommitmentsFor, loadLinkedCommitments, resolveCommitmentSources } from "./commitment-sources";

const DANA = "conversations/2026-10-08-dana-ortiz.md";
const PILOT = "tests/2026-10-06-paid-pilot.md";
const FOCUS = "decisions/2026-10-09-focus-on-small-agencies.md";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

const put = async (rel: string, text: string) => {
  await mkdir(path.dirname(path.join(env.dir, rel)), { recursive: true });
  await writeFile(path.join(env.dir, rel), text);
};

describe("resolveCommitmentSources", () => {
  it("names each kind of source and links to its page, reading each link once", async () => {
    const sources = await resolveCommitmentSources([DANA, PILOT, FOCUS, DANA, null, undefined, "guide:customer", "step:customer"]);
    expect([...sources.keys()].sort()).toEqual([FOCUS, DANA, PILOT].sort());
    expect(sources.get(DANA)).toEqual({ label: "From conversation with Dana Ortiz", href: "/conversations/2026-10-08-dana-ortiz" });
    expect(sources.get(PILOT)).toEqual({ label: "From test: Ask agency owners to pay for a scheduling pilot", href: "/tests/2026-10-06-paid-pilot" });
    expect(sources.get(FOCUS)).toEqual({ label: "From decision: Focus on agencies with 10-50 caregivers", href: "/decisions#2026-10-09-focus-on-small-agencies" });
  });
  it("puts a decision on page 2 when ten newer ones come first", async () => {
    for (let day = 23; day >= 14; day--) await put(`decisions/2026-10-${day}-newer-${day}.md`, `---\ntitle: Newer ${day}\ndate: 2026-10-${day}\ndecision: Continue\nwhy: Evidence\nreversible: true\n---\n`);
    expect((await resolveCommitmentSources([FOCUS])).get(FOCUS)?.href).toBe("/decisions?page=2#2026-10-09-focus-on-small-agencies");
  });
  it("omits a missing or unreadable source and keeps the rest", async () => {
    await put("conversations/2026-10-01-broken.md", "---\ntype: customer\n---\n");
    const sources = await resolveCommitmentSources(["conversations/2026-01-01-gone.md", "conversations/2026-10-01-broken.md", DANA]);
    expect([...sources.keys()]).toEqual([DANA]);
  });
});

describe("loadLinkedCommitments", () => {
  it("groups every week's commitments by link, open first, and skips repeating definitions", async () => {
    await put(
      "checkins/2026-W41.md",
      [
        "---",
        "week: 2026-W41",
        "commitments:",
        "  - id: c-old",
        "    text: Send Dana the one-pager",
        "    status: done",
        `    link: ${DANA}`,
        "  - id: c-weekly",
        "    text: Weekly post",
        "    status: open",
        `    link: ${DANA}`,
        "    repeat: { every: week, days: [tue] }",
        "---",
        "",
      ].join("\n"),
    );
    await put(
      "checkins/2026-W42.md",
      [
        "---",
        "week: 2026-W42",
        "commitments:",
        "  - id: c-1",
        "    text: Send Dana the pilot outline",
        "    due: 2026-10-16",
        "    status: open",
        `    link: ${DANA}`,
        "  - id: c-2",
        "    text: Offer five pilots",
        "    status: open",
        `    link: ${PILOT}`,
        "  - id: c-3",
        "    text: Drop this",
        "    status: dropped",
        "    reason: Changed plan",
        `    link: ${DANA}`,
        "  - id: c-4",
        "    text: Planned talk",
        "    status: open",
        "    link: step:customer",
        "---",
        "",
      ].join("\n"),
    );
    const grouped = await loadLinkedCommitments();
    expect([...grouped.keys()].sort()).toEqual([DANA, PILOT].sort());
    expect(grouped.get(DANA)).toEqual([
      { week: "2026-W42", id: "c-1", text: "Send Dana the pilot outline", due: "2026-10-16", status: "open", reason: null },
      { week: "2026-W42", id: "c-3", text: "Drop this", due: null, status: "dropped", reason: "Changed plan" },
      { week: "2026-W41", id: "c-old", text: "Send Dana the one-pager", due: null, status: "done", reason: null },
    ]);
    expect(await linkedCommitmentsFor(PILOT)).toEqual([{ week: "2026-W42", id: "c-2", text: "Offer five pilots", due: null, status: "open", reason: null }]);
    expect(await linkedCommitmentsFor(FOCUS)).toEqual([]);
  });
  it("skips a check-in it can't read without hiding the others", async () => {
    await put("checkins/2026-W41.md", "---\nweek: nope\n---\n");
    await put("checkins/2026-W42.md", `---\nweek: 2026-W42\ncommitments:\n  - id: c-1\n    text: Send Dana the pilot outline\n    status: open\n    link: ${DANA}\n---\n`);
    expect((await linkedCommitmentsFor(DANA)).map((c) => c.id)).toEqual(["c-1"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/commands/commitment-sources.test.ts`
Expected: FAIL, `Failed to resolve import "./commitment-sources"`.

- [ ] **Step 3: Write the module**

Create `web/src/commands/commitment-sources.ts`:

```ts
import { parseSourceLink, sortLinkedCommitments, sourceLabel, type CommitmentSource, type LinkedCommitment } from "../core/commitment-source";
import { byNewestDecision, decisionHref } from "../core/decision-order";
import { slugOf } from "../core/slug";
import { listEntries, readEntry } from "../store/read";
import { weekOfCheckinPath } from "./checkin";

/**
 * The label and page for each distinct source link, read once each. A link that isn't a source, or whose record is
 * missing or can't be read, has no entry: the commitment stays on Home without its line, and check-data carries the
 * warning. Decisions are looked up in their page order so the anchor lands on the right page.
 */
export async function resolveCommitmentSources(links: (string | null | undefined)[]): Promise<Map<string, CommitmentSource>> {
  const parsed = new Map<string, ReturnType<typeof parseSourceLink>>();
  for (const link of links) if (link && !parsed.has(link)) parsed.set(link, parseSourceLink(link));
  const out = new Map<string, CommitmentSource>();
  const wantsDecision = [...parsed.values()].some((p) => p?.kind === "decision");
  const decisions = wantsDecision ? (await listEntries("decision")).flatMap((e) => (e.ok ? [e] : [])).sort(byNewestDecision) : [];
  await Promise.all(
    [...parsed].map(async ([link, p]) => {
      if (!p) return;
      if (p.kind === "conversation") {
        const e = await readEntry("conversation", p.path);
        if (e?.ok) out.set(link, { label: sourceLabel("conversation", e.data.person), href: `/conversations/${slugOf(p.path)}` });
      } else if (p.kind === "test") {
        const e = await readEntry("test", p.path);
        if (e?.ok) out.set(link, { label: sourceLabel("test", e.data.title), href: `/tests/${slugOf(p.path)}` });
      } else {
        const index = decisions.findIndex((d) => d.path === p.path);
        if (index >= 0) out.set(link, { label: sourceLabel("decision", decisions[index].data.title), href: decisionHref(index, p.path) });
      }
    }),
  );
  return out;
}

/**
 * Every readable check-in's commitments that name a source record, grouped by link and sorted for display. Repeating
 * definitions are skipped (their weekly instances are ordinary commitments and are kept). Read once per page, not per card.
 */
export async function loadLinkedCommitments(): Promise<Map<string, LinkedCommitment[]>> {
  const grouped = new Map<string, LinkedCommitment[]>();
  for (const entry of await listEntries("checkin")) {
    if (!entry.ok) continue;
    const week = weekOfCheckinPath(entry.path);
    for (const c of entry.data.commitments) {
      if (c.repeat || !c.link || !parseSourceLink(c.link)) continue;
      const list = grouped.get(c.link) ?? [];
      list.push({ week, id: c.id, text: c.text, due: c.due ?? null, status: c.status, reason: c.reason ?? null });
      grouped.set(c.link, list);
    }
  }
  for (const [link, list] of grouped) grouped.set(link, sortLinkedCommitments(list));
  return grouped;
}

/** The commitments made from one record, for its page. */
export async function linkedCommitmentsFor(path: string): Promise<LinkedCommitment[]> {
  return (await loadLinkedCommitments()).get(path) ?? [];
}
```

Note on `due`: a repeating definition may hold a weekday (`tue`) in `due`; those are skipped above, so every kept `due` is an ISO date or null.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/commands/commitment-sources.test.ts && pnpm exec tsc --noEmit`
Expected: PASS, 5 tests; tsc clean (`c.status` is already the `"open" | "done" | "dropped"` union from the schema).

- [ ] **Step 5: Commit**

```bash
git add web/src/commands/commitment-sources.ts web/src/commands/commitment-sources.test.ts
git commit -m "feat: resolve commitment sources and group linked commitments by record"
```

---

### Task 5: The guarded write

**Files:**
- Create: `web/src/commands/commitments.ts`
- Test: `web/src/commands/commitments.test.ts`

**Interfaces:**
- Consumes: `parseSourceLink` (Task 1); `addCommitment`, `loadCheckin` from `commands/checkin.ts`; `readEntry` from `store/read.ts`; `isoDate` from `store/schemas.ts`.
- Produces: `addLinkedCommitment(weekId: string, input: { text: string; due: string | null; link: string }): Promise<string>` (the new commitment's id). Task 6's server action calls it.

- [ ] **Step 1: Write the failing test**

Create `web/src/commands/commitments.test.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTempData } from "../store/test-helpers";
import { loadCheckin } from "./checkin";
import { addLinkedCommitment } from "./commitments";

const DANA = "conversations/2026-10-08-dana-ortiz.md";

let env: Awaited<ReturnType<typeof useTempData>>;
beforeEach(async () => (env = await useTempData()));
afterEach(() => env.cleanup());

describe("addLinkedCommitment", () => {
  it("saves the commitment in the week with the link unchanged, and leaves the source alone", async () => {
    const before = await readFile(path.join(env.dir, DANA), "utf8");
    const id = await addLinkedCommitment("2026-W42", { text: "  Send Dana the pilot outline ", due: "2026-10-16", link: DANA });
    const saved = (await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id);
    expect(saved).toMatchObject({ text: "Send Dana the pilot outline", due: "2026-10-16", status: "open", link: DANA });
    expect(await readFile(path.join(env.dir, DANA), "utf8")).toBe(before);
  });
  it("takes an empty due date as none", async () => {
    const id = await addLinkedCommitment("2026-W42", { text: "Call back", due: "", link: "decisions/2026-10-09-focus-on-small-agencies.md" });
    expect((await loadCheckin("2026-W42")).data.commitments.find((c) => c.id === id)?.due).toBeNull();
  });
  it("refuses empty text and a bad date before touching the check-in", async () => {
    await expect(addLinkedCommitment("2026-W42", { text: "  ", due: null, link: DANA })).rejects.toThrow("Write what you'll do.");
    await expect(addLinkedCommitment("2026-W42", { text: "Call", due: "next friday", link: DANA })).rejects.toThrow("Use a real date.");
    expect((await loadCheckin("2026-W42")).data.commitments).toHaveLength(2);
  });
  it("refuses a link that isn't a source record", async () => {
    for (const link of ["guide:customer", "step:customer", "program/week-01.md", "../founder.md", ""])
      await expect(addLinkedCommitment("2026-W42", { text: "Call", due: null, link })).rejects.toThrow("isn't one Founderive can link to");
  });
  it("refuses a source that is gone, and one that needs repair", async () => {
    await expect(addLinkedCommitment("2026-W42", { text: "Call", due: null, link: "conversations/2026-01-01-gone.md" })).rejects.toThrow("no longer there");
    await writeFile(path.join(env.dir, DANA), "---\ntype: customer\n---\n");
    await expect(addLinkedCommitment("2026-W42", { text: "Call", due: null, link: DANA })).rejects.toThrow("needs repair");
    expect((await loadCheckin("2026-W42")).data.commitments).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/commands/commitments.test.ts`
Expected: FAIL, `Failed to resolve import "./commitments"`.

- [ ] **Step 3: Write the command**

Create `web/src/commands/commitments.ts`:

```ts
import { parseSourceLink } from "../core/commitment-source";
import { readEntry } from "../store/read";
import { isoDate } from "../store/schemas";
import { addCommitment } from "./checkin";

/**
 * A commitment made on a conversation, decision or test: the record's path travels in `link`, so Home can say where it
 * came from and the record can list it. The source must be a record Founderive knows, present and readable; nothing is
 * written to it. The week guard (`assertThisWeek`) belongs to the server action, not here.
 */
export async function addLinkedCommitment(weekId: string, input: { text: string; due: string | null; link: string }): Promise<string> {
  const source = parseSourceLink(input.link);
  if (!source) throw new Error("The commitment wasn't saved because this record isn't one Founderive can link to. Reload the page.");
  const text = input.text.trim();
  if (!text) throw new Error("Write what you'll do.");
  const due = (input.due ?? "").trim();
  if (due && !isoDate.safeParse(due).success) throw new Error("Use a real date.");
  const entry = await readEntry(source.kind, source.path);
  if (!entry) throw new Error("The commitment wasn't saved because this record is no longer there. Reload the page.");
  if (!entry.ok) throw new Error("The commitment wasn't saved because this record needs repair. Fix the flagged file and try again.");
  return addCommitment(weekId, { text, due: due || null, link: source.path });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/commands/commitments.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/commands/commitments.ts web/src/commands/commitments.test.ts
git commit -m "feat: save a commitment linked to the record it came from"
```

---

### Task 6: The server action, the form and the list

**Files:**
- Modify: `web/src/app/(workbook)/actions.ts` (add `saveLinkedCommitment` after `saveNewCommitment`)
- Create: `web/src/components/commitments/LinkedCommitmentForm.tsx`
- Create: `web/src/components/commitments/LinkedCommitments.tsx`

**Interfaces:**
- Consumes: `addLinkedCommitment` (Task 5); `assertThisWeek` from `commands/today.ts`; `field`, `run` from `(workbook)/action-utils.ts`; `Field`, `FormAlert`, `describedBy` from `components/workbook/Field.tsx`; `buttonQuiet`, `inputClass` from `components/workbook/form.ts`; `IDLE`, `ActionState` from `lib/action-state.ts`; `dueWords` from `core/due.ts`; `LinkedCommitment`, `SourceKind` from Task 1.
- Produces:
  - `saveLinkedCommitment(_prev: ActionState, fd: FormData): Promise<ActionState>` reading `week`, `text`, `due`, `link`.
  - `<LinkedCommitmentForm weekId link sourceKind />` where `sourceKind` is `"conversation" | "decision"`.
  - `<LinkedCommitments commitments today />` returning null when the list is empty.

- [ ] **Step 1: Add the server action**

In `web/src/app/(workbook)/actions.ts`, add to the imports:

```ts
import { addLinkedCommitment } from "@/commands/commitments";
```

After `saveNewCommitment`, add:

```ts
/** A commitment made on a conversation or decision: the record's path goes in `link`. Separate from saveNewCommitment, so Home's form never trusts a hidden link. */
export async function saveLinkedCommitment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = { text: field(fd, "text"), due: field(fd, "due") };
  return run(async () => {
    await assertThisWeek(field(fd, "week"));
    await addLinkedCommitment(field(fd, "week"), { text: values.text, due: values.due || null, link: field(fd, "link") });
  }, values);
}
```

- [ ] **Step 2: Write the form**

Create `web/src/components/commitments/LinkedCommitmentForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { saveLinkedCommitment } from "@/app/(workbook)/actions";
import { Field, FormAlert, describedBy } from "@/components/workbook/Field";
import { buttonQuiet, inputClass } from "@/components/workbook/form";
import type { SourceKind } from "@/core/commitment-source";
import { IDLE } from "@/lib/action-state";

/**
 * Make a commitment where the reason is: on a conversation or a decision. The record's path travels in `link`, so Home
 * says where it came from. Secondary everywhere: a quiet disclosure, never the page's primary action. After a save the
 * fields clear (the action returns no values) and the saved line arrives through the live data event.
 */
export function LinkedCommitmentForm({ weekId, link, sourceKind }: { weekId: string; link: string; sourceKind: Exclude<SourceKind, "test"> }) {
  const [state, action, pending] = useActionState(saveLinkedCommitment, IDLE);
  const id = `${link}-commitment`;
  const hint = `It's added to this week on Home, linked to this ${sourceKind}.`;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-teal-dark">Make a commitment</summary>
      <form action={action} className="mt-3 space-y-3" noValidate>
        <input type="hidden" name="week" value={weekId} />
        <input type="hidden" name="link" value={link} />
        <FormAlert message={state.status === "error" ? state.message : undefined} />
        {state.status === "saved" && (
          <p role="status" className="text-sm text-teal-dark">
            Commitment saved
          </p>
        )}
        <Field id={`${id}-text`} label="What will you do?" hint={hint}>
          <input id={`${id}-text`} name="text" type="text" defaultValue={state.values?.text ?? ""} placeholder="Send Dana the pilot outline" className={inputClass} aria-describedby={describedBy(`${id}-text`, undefined, hint)} />
        </Field>
        <Field id={`${id}-due`} label="Due (optional)">
          <input id={`${id}-due`} name="due" type="date" defaultValue={state.values?.due ?? ""} className={inputClass} />
        </Field>
        <button type="submit" disabled={pending} className={buttonQuiet}>
          {pending ? "Saving…" : "Save commitment"}
        </button>
      </form>
    </details>
  );
}
```

If `useActionState` keeps the typed values in the DOM after a successful save (uncontrolled inputs keep what was typed), add `key={state.status === "saved" ? "saved" : "editing"}` on the `<form>` so React remounts it empty after success. Check this in the dry run (Task 11, step 3).

- [ ] **Step 3: Write the list**

Create `web/src/components/commitments/LinkedCommitments.tsx`:

```tsx
import type { LinkedCommitment } from "@/core/commitment-source";
import { dueWords } from "@/core/due";

/**
 * What was promised because of this record, read-only: open first with due words, then done and dropped under a
 * disclosure. Renders nothing when there is nothing to list, so a record with no commitments shows no empty card.
 * Done and Drop stay on Home.
 */
export function LinkedCommitments({ commitments, today }: { commitments: LinkedCommitment[]; today: string }) {
  if (commitments.length === 0) return null;
  const open = commitments.filter((c) => c.status === "open");
  const closed = commitments.filter((c) => c.status !== "open");
  return (
    <div className="space-y-2 text-sm">
      {open.length > 0 && (
        <ul className="space-y-1">
          {open.map((c) => {
            const when = dueWords({ due: c.due, week: c.week }, today);
            return (
              <li key={`${c.week}:${c.id}`} className="text-ink">
                {c.text}
                {when && <span className="text-muted"> · {when}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {closed.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted">Done or dropped · {closed.length}</summary>
          <ul className="mt-1 space-y-1">
            {closed.map((c) => (
              <li key={`${c.week}:${c.id}`} className="text-muted">
                {c.status === "done" ? "Done: " : "Dropped: "}
                {c.text}
                {c.status === "dropped" && c.reason ? ` · ${c.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Lint and type-check**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: clean. (The components aren't rendered anywhere yet; that is Tasks 7 to 9.)

- [ ] **Step 5: Commit**

```bash
git add "web/src/app/(workbook)/actions.ts" web/src/components/commitments/LinkedCommitmentForm.tsx web/src/components/commitments/LinkedCommitments.tsx
git commit -m "feat: linked commitment form, list and server action"
```

---

### Task 7: Conversation page

**Files:**
- Modify: `web/src/commands/conversations.ts:282-305` (`ConversationView`, `loadConversation`)
- Modify: `web/src/app/(workbook)/conversations/[slug]/page.tsx` (imports; the Follow-ups card at line 142)
- Test: `web/src/commands/conversations.test.ts` (extend the `loadConversation` test near line 152)

**Interfaces:**
- Consumes: `linkedCommitmentsFor` (Task 4); `LinkedCommitmentForm`, `LinkedCommitments` (Task 6); `isoWeekId` from `core/week.ts`; `addCommitment` from `commands/checkin.ts` (test only).
- Produces: `ConversationView` (ready) gains `commitments: LinkedCommitment[]`.

- [ ] **Step 1: Write the failing test**

In `web/src/commands/conversations.test.ts`, find the test that calls `loadConversation("2026-10-08-dana-ortiz-bright-home-care")` (around line 152) and add a new test right after that `it` block, inside the same `describe`:

```ts
  it("lists the commitments made from this conversation, open first", async () => {
    const c = await createConversation(DANA);
    await addCommitment("2026-W42", { text: "Send Dana the pilot outline", due: "2026-10-16", link: c });
    await addCommitment("2026-W42", { text: "Unrelated" });
    const view = await loadConversation(slugOf(c));
    expect(view.status === "ready" && view.commitments).toEqual([{ week: "2026-W42", id: expect.any(String), text: "Send Dana the pilot outline", due: "2026-10-16", status: "open", reason: null }]);
  });
```

Add to the file's imports (neither is there yet): `import { addCommitment } from "./checkin";` and `import { slugOf } from "../core/slug";`. `createConversation(input)` returns the new record's path as a string. This file clears the loop records in `beforeEach`, so the fixture's Dana isn't there; `createConversation(DANA)` makes the one the test needs.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/commands/conversations.test.ts`
Expected: FAIL, `commitments` is undefined on the view.

- [ ] **Step 3: Extend the loader**

In `web/src/commands/conversations.ts`:
- Add `import { linkedCommitmentsFor } from "./commitment-sources";` and `import type { LinkedCommitment } from "../core/commitment-source";`.
- In `ConversationView`'s ready branch, add `commitments: LinkedCommitment[];` after `tests: TestOption[]`.
- In `loadConversation`, after `const tests = …`, add `const commitments = await linkedCommitmentsFor(entry.path);` and add `commitments,` to the returned object after `tests,`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/commands/conversations.test.ts`
Expected: PASS.

- [ ] **Step 5: Render the card**

In `web/src/app/(workbook)/conversations/[slug]/page.tsx`:
- Add imports:

```tsx
import { LinkedCommitmentForm } from "@/components/commitments/LinkedCommitmentForm";
import { LinkedCommitments } from "@/components/commitments/LinkedCommitments";
import { isoWeekId } from "@/core/week";
```

- Directly after the Follow-ups card

```tsx
        <Card title="Follow-ups">
          <FollowUps path={view.path} followUps={c.followUps} today={today} />
        </Card>
```

add:

```tsx
        {/* What was promised because of this conversation. The form only once the founder has confirmed the record. */}
        {(view.commitments.length > 0 || !c.seeded) && (
          <Card title="Commitments">
            <LinkedCommitments commitments={view.commitments} today={today} />
            {!c.seeded && <LinkedCommitmentForm weekId={isoWeekId(today)} link={view.path} sourceKind="conversation" />}
          </Card>
        )}
```

- [ ] **Step 6: Lint, type-check, commit**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: clean.

```bash
git add web/src/commands/conversations.ts web/src/commands/conversations.test.ts "web/src/app/(workbook)/conversations/[slug]/page.tsx"
git commit -m "feat: a conversation lists its commitments and takes a new one"
```

---

### Task 8: Decision cards

**Files:**
- Modify: `web/src/commands/decisions.ts:10` (`DecisionRow`), `:124-150` (`loadDecisions`)
- Modify: `web/src/app/(workbook)/decisions/page.tsx` (imports; the card call at line 60; `DecisionCard` at lines 102-189)
- Test: `web/src/commands/decisions.test.ts`

**Interfaces:**
- Consumes: `loadLinkedCommitments` (Task 4); `LinkedCommitmentForm`, `LinkedCommitments` (Task 6); `isoWeekId` from `core/week.ts`.
- Produces: `DecisionRow` gains `commitments: LinkedCommitment[]`. `DecisionCard` takes `weekId: string`.

- [ ] **Step 1: Write the failing test**

In `web/src/commands/decisions.test.ts`, inside `describe("decision log", …)`, add at the end:

This file clears the loop records in `beforeEach`, so the decision is built the way the file's second test builds one (`parseDecisionForm(form({...}))` then `createDecision(r.input)`; `reversible` is the form value `"yes"`).

```ts
  it("attaches each decision's commitments, read once for the page", async () => {
    const c = await createConversation(DANA);
    const r = parseDecisionForm(form({ title: "Focus on small agencies", date: "2026-10-09", decision: "Only agencies with 10-50 caregivers", why: "The owner feels the pain directly", reversible: "yes", evidence: [c] }));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const d = await createDecision(r.input);
    await addCommitment("2026-W42", { text: "Tell the two large agencies", link: d });
    const { rows } = await loadDecisions();
    expect(rows.find((row) => row.path === d)?.commitments).toEqual([{ week: "2026-W42", id: expect.any(String), text: "Tell the two large agencies", due: null, status: "open", reason: null }]);
    expect(rows.filter((row) => row.path !== d).every((row) => row.commitments.length === 0)).toBe(true);
  });
```

Add `import { addCommitment } from "./checkin";` to the file's imports.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/commands/decisions.test.ts`
Expected: FAIL, `commitments` is undefined on the row.

- [ ] **Step 3: Extend the loader**

In `web/src/commands/decisions.ts`:
- Add `import { loadLinkedCommitments } from "./commitment-sources";` and `import type { LinkedCommitment } from "../core/commitment-source";`.
- Change `DecisionRow` to `{ path: string; data: Decision; broken: BrokenLink[]; notes: string; commitments: LinkedCommitment[] }`.
- In `loadDecisions`, read the commitments once alongside the rest:

```ts
  const [entries, conversations, tests, present, linked] = await Promise.all([listEntries("decision"), listEntries("conversation"), listEntries("test"), existingPaths(), loadLinkedCommitments()]);
  const rows = entries
    .flatMap((e) => (e.ok ? [{ path: e.path, data: e.data, broken: brokenLinks(linksOf("decision", e.data), (r) => present.has(r)), notes: e.body, commitments: linked.get(e.path) ?? [] }] : []))
    .sort(byNewestDecision);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/commands/decisions.test.ts && pnpm exec tsc --noEmit`
Expected: PASS. If tsc reports another place that builds a `DecisionRow` literal (search `grep -rn "DecisionRow" src --include='*.ts' --include='*.tsx'`), give it `commitments: []`.

- [ ] **Step 5: Render on the card**

In `web/src/app/(workbook)/decisions/page.tsx`:
- Add imports:

```tsx
import { LinkedCommitmentForm } from "@/components/commitments/LinkedCommitmentForm";
import { LinkedCommitments } from "@/components/commitments/LinkedCommitments";
import { isoWeekId } from "@/core/week";
```

- Where the cards are rendered (line 60), pass the week once: change `<DecisionCard row={r} labels={labels} today={today} />` to `<DecisionCard row={r} labels={labels} today={today} weekId={isoWeekId(today)} />`.
- Change the signature to `function DecisionCard({ row, labels, today, weekId }: { row: DecisionRow; labels: Map<string, string>; today: string; weekId: string })`.
- Directly before `{d.status === "open" && <ResolveDecisionForm path={row.path} />}`, add:

```tsx
      {/* What was promised because of this decision. The form only once the founder has confirmed the record. */}
      {(row.commitments.length > 0 || !d.seeded) && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-sm font-medium text-ink">Commitments</h3>
          <div className="mt-2">
            <LinkedCommitments commitments={row.commitments} today={today} />
          </div>
          {!d.seeded && <LinkedCommitmentForm weekId={weekId} link={row.path} sourceKind="decision" />}
        </div>
      )}
```

- [ ] **Step 6: Lint, type-check, commit**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: clean.

```bash
git add web/src/commands/decisions.ts web/src/commands/decisions.test.ts "web/src/app/(workbook)/decisions/page.tsx"
git commit -m "feat: a decision card lists its commitments and takes a new one"
```

---

### Task 9: Test page shows the real next commitment

**Files:**
- Modify: `web/src/commands/venture-tests.ts:362-404` (`TestView`, `loadTest`)
- Modify: `web/src/app/(workbook)/tests/[slug]/page.tsx:211-216` (the "Next commitment" line)
- Test: `web/src/commands/venture-tests.test.ts`

**Interfaces:**
- Consumes: `linkedCommitmentsFor` (Task 4); `LinkedCommitments` (Task 6); `loadFounderToday` from `commands/today.ts`.
- Produces: `TestView` (ready) gains `commitments: LinkedCommitment[]`.

- [ ] **Step 1: Write the failing test**

In `web/src/commands/venture-tests.test.ts`, find the test that completes a test with a next commitment (`grep -n "nextCommitment" src/commands/venture-tests.test.ts | head -5`) and add a new `it` after it in the same `describe`, using that test's own setup for creating, starting and completing a test (copy its calls; the fixture test `tests/2026-10-06-paid-pilot.md` is already running and linked to Dana, so completing it directly also works):

This file clears the loop records in `beforeEach`, so the fixture test isn't there; the test builds its own, exactly as the existing completion test does (`createTest(PILOT, TODAY)`, `linkEvidence`, `completeTest(t, complete(), TODAY)`; `complete()` is the file's helper with `nextCommitment: "Onboard the two pilots"` and `nextCommitmentDue: "2026-10-20"`).

```ts
  it("lists the commitment written when the test was completed, with its status", async () => {
    const t = await createTest(PILOT, TODAY);
    await linkEvidence(t, await createConversation(DANA));
    const { commitmentId } = await completeTest(t, complete(), TODAY);
    const view = await loadTest(slugOf(t));
    expect(view.status === "ready" && view.commitments).toEqual([{ week: "2026-W42", id: commitmentId, text: "Onboard the two pilots", due: "2026-10-20", status: "open", reason: null }]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/commands/venture-tests.test.ts`
Expected: the new test FAILS with `commitments` undefined.

- [ ] **Step 3: Extend the loader**

In `web/src/commands/venture-tests.ts`:
- Add `import { linkedCommitmentsFor } from "./commitment-sources";` and `import type { LinkedCommitment } from "../core/commitment-source";`.
- In `TestView`'s ready branch add `commitments: LinkedCommitment[];` after `broken: BrokenLink[];`.
- In `loadTest`, after `const present = await existingPaths();`, add `const commitments = await linkedCommitmentsFor(entry.path);` and add `commitments,` to the returned object after `broken: …`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/commands/venture-tests.test.ts`
Expected: PASS.

- [ ] **Step 5: Render it**

In `web/src/app/(workbook)/tests/[slug]/page.tsx`:
- Add imports: `import { LinkedCommitments } from "@/components/commitments/LinkedCommitments";` and `import { loadFounderToday } from "@/commands/today";`.
- In `TestContent`, change `const view = await loadTest(slug);` to `const [view, today] = await Promise.all([loadTest(slug), loadFounderToday()]);`.
- Replace

```tsx
              {t.nextCommitment && (
                <p className="mt-2 text-sm text-ink">
                  <span className="font-medium">Next commitment:</span> {t.nextCommitment}
                  {t.nextCommitmentDue ? ` · due ${formatDate(t.nextCommitmentDue)}` : ""}
                </p>
              )}
```

with

```tsx
              {/* The commitment written at completion, with its status, when it's in a check-in; the test's own words otherwise. */}
              {view.commitments.length > 0 ? (
                <div className="mt-2">
                  <p className="text-sm font-medium text-ink">Next commitment</p>
                  <div className="mt-1">
                    <LinkedCommitments commitments={view.commitments} today={today} />
                  </div>
                </div>
              ) : (
                t.nextCommitment && (
                  <p className="mt-2 text-sm text-ink">
                    <span className="font-medium">Next commitment:</span> {t.nextCommitment}
                    {t.nextCommitmentDue ? ` · due ${formatDate(t.nextCommitmentDue)}` : ""}
                  </p>
                )
              )}
```

- [ ] **Step 6: Lint, type-check, commit**

Run: `pnpm lint && pnpm exec tsc --noEmit`
Expected: clean.

```bash
git add web/src/commands/venture-tests.ts web/src/commands/venture-tests.test.ts "web/src/app/(workbook)/tests/[slug]/page.tsx"
git commit -m "feat: a test page shows its next commitment with its status"
```

---

### Task 10: Home says where a commitment came from; check-data warns on a dead link

**Files:**
- Modify: `web/src/commands/today.ts` (the `buildDueItems` call at line 169)
- Modify: `web/src/components/home/DueList.tsx:53-62`
- Modify: `web/src/store/check.ts:87-95` (the checkin commitments loop)
- Test: `web/src/commands/today.test.ts`, `web/src/store/check-steps.test.ts`

**Interfaces:**
- Consumes: `resolveCommitmentSources` (Task 4); `parseSourceLink` (Task 1); `dueItems`'s `sources` (Task 2).
- Produces: `TodayView.dueItems[*].source` for linked commitments (and so `pnpm -s today --json`); a check-data warning for a source link to a missing file.

- [ ] **Step 1: Write the failing tests**

In `web/src/commands/today.test.ts`, inside `describe("loadToday", …)`, add:

```ts
  it("says where a linked commitment came from, and nothing when the source is gone", async () => {
    await addCommitment("2026-W42", { text: "Send Dana the pilot outline", due: "2026-10-16", link: "conversations/2026-10-08-dana-ortiz.md" });
    await addCommitment("2026-W42", { text: "Lost source", due: "2026-10-17", link: "conversations/2026-01-01-gone.md" });
    const due = (await ready()).dueItems;
    expect(due.find((i) => i.text === "Send Dana the pilot outline")).toMatchObject({ kind: "commitment", source: { label: "From conversation with Dana Ortiz", href: "/conversations/2026-10-08-dana-ortiz" } });
    expect(due.find((i) => i.text === "Lost source")?.source).toBeUndefined();
    expect(due.find((i) => i.id === "c-1")?.source).toBeUndefined();
  });
```

In `web/src/store/check-steps.test.ts`, inside `describe("step links", …)`, add:

```ts
  it("warns when a commitment links to a record that isn't there, and not when it is", async () => {
    await put("conversations/2026-10-08-dana.md", "---\ntype: customer\nperson: Dana\nareas: [problem]\n---\n");
    await put(
      "checkins/2026-W43.md",
      "---\nweek: 2026-W43\ncommitments:\n  - id: c-1\n    text: Send the outline\n    link: conversations/2026-10-08-dana.md\n  - id: c-2\n    text: Lost\n    link: conversations/2026-01-01-gone.md\n  - id: c-3\n    text: Program work\n    link: program/week-09.md\n---\n",
    );
    const r = await checkData();
    const hits = r.warnings.filter((w) => /links to/.test(w.warning));
    expect(hits).toEqual([{ path: "checkins/2026-W43.md", warning: 'commitments: "c-2" links to conversations/2026-01-01-gone.md, which isn\'t in founder-data. Fix the link or remove it.' }]);
    expect(r.errors).toEqual([]);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test -- src/commands/today.test.ts src/store/check-steps.test.ts`
Expected: both new tests FAIL (`source` undefined; no "links to" warning).

- [ ] **Step 3: Resolve sources in `loadToday`**

In `web/src/commands/today.ts`:
- Add `import { resolveCommitmentSources } from "./commitment-sources";`.
- Replace `const dueList = buildDueItems({ commitments: ranked, homework, followUps, decisions: openDecisions, revisits });` with:

```ts
  // Where each linked commitment came from, read once per distinct link. A missing or unreadable source leaves the commitment without its line.
  const sources = await resolveCommitmentSources(ranked.filter((c) => c.status === "open").map((c) => c.link));
  const dueList = buildDueItems({ commitments: ranked, homework, followUps, decisions: openDecisions, revisits, sources });
```

- [ ] **Step 4: Warn in check-data**

In `web/src/store/check.ts`:
- Add `import { parseSourceLink } from "../core/commitment-source";`.
- Inside the `if (kind === "checkin") for (const c of …commitments) { … }` block, after the contact-details check, add:

```ts
        // A commitment that names a conversation, decision or test it came from: the record should be there. A missing one is a warning, like any broken link.
        if (c.link && parseSourceLink(c.link) && !present.has(c.link))
          warnings.push({ path: rel, warning: `commitments: "${c.id}" links to ${c.link}, which isn't in founder-data. Fix the link or remove it.` });
```

- [ ] **Step 5: Show it on Home**

In `web/src/components/home/DueList.tsx`, replace

```tsx
                <span className="text-sm text-ink">
                  {i.href ? (
                    <Link href={i.href} className="font-medium text-teal-dark underline-offset-2 hover:underline">
                      {i.text}
                    </Link>
                  ) : (
                    i.text
                  )}
                  {dueWords(i, today) && <span className="text-muted"> · {dueWords(i, today)}</span>}
                </span>
```

with

```tsx
                <span className="text-sm text-ink">
                  {i.href ? (
                    <Link href={i.href} className="font-medium text-teal-dark underline-offset-2 hover:underline">
                      {i.text}
                    </Link>
                  ) : (
                    i.text
                  )}
                  {dueWords(i, today) && <span className="text-muted"> · {dueWords(i, today)}</span>}
                  {/* Where a commitment came from: the record it was made on. Quiet, under the text; the commitment itself stays plain. */}
                  {i.source && (
                    <Link href={i.source.href} className="mt-0.5 block text-xs font-medium text-teal-dark underline-offset-2 hover:underline">
                      {i.source.label}
                    </Link>
                  )}
                </span>
```

- [ ] **Step 6: Run everything**

Run: `pnpm test && pnpm lint && pnpm exec tsc --noEmit && pnpm -s check-data`
Expected: all tests pass; lint and tsc clean; check-data on the configured data folder reports no new warnings (it only warns on a source link to a missing file).

- [ ] **Step 7: Commit**

```bash
git add web/src/commands/today.ts web/src/commands/today.test.ts web/src/components/home/DueList.tsx web/src/store/check.ts web/src/store/check-steps.test.ts
git commit -m "feat: Home says where a linked commitment came from; check-data warns on a dead link"
```

---

### Task 11: Agent instructions and the dry run

**Files:**
- Modify: `AGENTS.md` (lines 33, 52, 131, 143 as numbered at the start of this plan)
- Modify: `docs/product/contextual-commitments-direction.md` (add a "What was verified" section after the intro, as `close-the-loop-direction.md` has)
- Modify: `.superpowers/sdd/progress.md` (gitignored ledger)

- [ ] **Step 1: AGENTS.md**

Line 33, step 4 "What's due": after `say each one once.` insert: `When a due item has `source`, say it after the due words ("Send Dana the pilot outline, due Fri, from your conversation with Dana").`

Line 52, replace the bullet with:

```
- **A commitment they make** → `commitments` in this week's check-in: `{ id, text, due?, status: open, link? }`. When they make it while talking about a conversation, decision or test, `link` is that record's path (`conversations/2026-10-14-dana.md`), so Home can say where it came from and the record lists it. Never on a repeating definition.
```

Line 131, append to the "Links are kept on both sides" bullet: ` A commitment's `link` to a conversation, decision or test that isn't there is a warning too; fix or remove it.`

Line 143, in the `checkins` row, change `link? (a founder-data path, `guide:<step id>`, or `step:<block id>`)` to `link? (the path of the conversation, decision or test it comes from, another founder-data path, `guide:<step id>`, or `step:<block id>`)`.

Then regenerate nothing: the data folder's `CLAUDE.md`/`AGENTS.md` are generated at app start from this file (`store/agent-home.ts`); the dry run in step 3 starts the app and so refreshes them on the scratch folder.

- [ ] **Step 2: Commit the instructions**

```bash
git add AGENTS.md
git commit -m "docs: the agent links a commitment to the record it came from"
```

- [ ] **Step 3: Dry run on scratch data**

Never on Britt's real data folder (`~/Founderive/Intraview`). Make a scratch copy and run one dev server against it on its own port (see memory `scratch-data-dry-run`):

```bash
SCRATCH=$(mktemp -d /tmp/founderive-scratch-XXXX) && cp -R web/test-data/. "$SCRATCH" && echo "$SCRATCH"
cd web && FOUNDER_DATA_DIR="$SCRATCH" PORT=3100 pnpm dev   # in the background
```

Then, with `FOUNDER_DATA_DIR="$SCRATCH"` on each command from `web/`:

1. Open `http://localhost:3100/conversations/2026-10-08-dana-ortiz`: a "Commitments" card after Follow-ups holding only the "Make a commitment" disclosure (no empty list text). Open it: the hint reads "linked to this conversation." Save "Send Dana the pilot outline", due 2026-10-16: "Commitment saved", the row appears above the form with "due Fri", the fields are empty. Note whether the inputs cleared; if not, apply the `key=` remount from Task 6 step 2.
2. Save again with empty text: "Write what you'll do." and the date kept. (A bad date can't be typed into the date input; the command test in Task 5 covers it.)
3. `http://localhost:3100/decisions`: the fixture decision's card shows a "Commitments" heading and the disclosure. Save "Tell the two large agencies" with no date: it lists with no due words.
4. Complete the fixture test with a next commitment through the test page ("Finish the test"): the Decision section shows "Next commitment" with the commitment and its due words, not the plain line.
5. `http://localhost:3100/today`: Due shows the three new commitments, each once, each with its "From …" line; the decision's line lands on `/decisions#2026-10-09-focus-on-small-agencies`; Done on one of them updates the record's list after the data event. Home's main action is unchanged from before (the overdue `c-1`).
6. `FOUNDER_DATA_DIR="$SCRATCH" pnpm -s today --json | grep -A2 '"source"'` shows the three sources. `FOUNDER_DATA_DIR="$SCRATCH" pnpm -s check-data`: valid, no warnings. Then `mv "$SCRATCH/conversations/2026-10-08-dana-ortiz.md" "$SCRATCH/conversations/2026-10-08-dana-ortiz.md.bak"` and check-data again: the "links to … isn't in founder-data" warning; Home still lists the commitment with no line. Move the file back.
7. Pin `today: 2026-10-20` in the scratch `founder.md` and reload Home: the carried commitments keep their lines; Done on one writes to `checkins/2026-W42.md`.

If the Chrome extension isn't connected, read pages as rendered HTML (`curl -s http://localhost:3100/... | grep -o 'From conversation[^<]*'`) and make the writes through the commands under `FOUNDER_DATA_DIR`, as the previous dry runs did. Stop the dev server and `rm -rf "$SCRATCH"` when done.

- [ ] **Step 4: Record the result**

In `docs/product/contextual-commitments-direction.md`, add a `## What was verified (<date>)` section after the intro paragraphs, in the shape of the same section in `close-the-loop-direction.md`: how it was run, one numbered line per check above with what was seen, and anything decided during the build. Append the task outcome to `.superpowers/sdd/progress.md`.

```bash
git add docs/product/contextual-commitments-direction.md
git commit -m "docs: contextual commitments dry run result"
```

---

## Verification before the PR

From `web/`:

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm -s check-data
```

All green, then `superpowers:requesting-code-review` on the branch (and, per memory `two-reviewers-for-safety`, a Codex pass if the final diff touched the permission or guardrail paths; this plan does not, but the write guard in Task 5 is worth its eye). Open the PR against `main` with the brief and this plan linked. Confirm the diff holds no founder-data (`git diff --stat main...HEAD` lists only `web/`, `docs/` and `AGENTS.md`).

## Done means

- A commitment made on a conversation or decision carries the record's path in `link`.
- Home shows "From …" under it as a link to the record; `pnpm -s today --json` carries `source`.
- The conversation, decision and test pages list their commitments; the test page shows the completion commitment with its status.
- Ranking is unchanged and locked by tests.
- A dead source link is a check-data warning; the commitment stays visible.
- No new record kind, page or primary action; steps untouched.
