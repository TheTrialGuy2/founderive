# Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A quiet Home button hands the founder's last five confirmed customer conversations to the Claude panel, where a new `synthesize` skill drafts themes for the founder to confirm and writes one open decision record.

**Architecture:** One pure core module (`web/src/core/synthesis.ts`) decides which conversations qualify and what the button says. `loadToday()` carries the count so Home and `pnpm today --json` agree. A client component types a fixed line into the Claude panel through the existing `askClaude()` event. The skill is prose in `.claude/skills/synthesize/SKILL.md`, routed by one line in `AGENTS.md`. No schema change, no new page, no new field.

**Tech Stack:** Next 16 (Cache Components, `await connection()` inside `<Suspense>`), React 19, TypeScript, Zod 4 schemas in `web/src/store/schemas.ts`, Vitest (`pnpm test` from `web/`), pnpm.

Spec: `docs/product/synthesis-direction.md`. Read it first.

## Global Constraints

- Everything under `web/` runs from `web/`: `pnpm test`, `pnpm -s check-data`, `pnpm -s today --json`.
- `web/src/store/` is the only code that reads or writes founder-data. Core modules are pure and take records as arguments.
- The founder decides. The skill never sets `decision`, `why`, `reversible`, `whatChangesConfirmed`, never clears `seeded`, never edits a confirmed conversation or canvas block.
- A record the agent drafts carries `seeded: true` and a `source`.
- Dates are `YYYY-MM-DD`. New files are `<folder>/YYYY-MM-DD-<slug>.md`; add `-2` if the name exists; never overwrite, never delete.
- Copy rules: counts in words, never a shortfall, never a score. Buttons act, links navigate. Home has one main action and this feature never becomes it.
- Pages that read data `await connection()` inside `<Suspense>`. Client components start with `"use client"`.
- The exact line the button types is `Synthesize my last five customer conversations in Founderive.` It appears in `core/synthesis.ts`, `AGENTS.md` and the skill, and must stay identical in all three.
- The minimum to show the button is 3 qualifying conversations. The label caps at 5.
- Commit after every task. Branch: `feat/synthesis-direction` (already exists, holds the brief).

---

### Task 1: Core module, `synthesizable` and the button label

**Files:**
- Create: `web/src/core/synthesis.ts`
- Test: `web/src/core/synthesis.test.ts`

**Interfaces:**
- Consumes: `isEvidenceEligible(c, notes)` from `web/src/core/conversations.ts` (signature `(c: { type; seeded?; observedBehavior?; quotes?; numbers? }, notes: string) => boolean`) and `conversationDate(c)` from `web/src/core/path.ts` (signature `(c: { path: string; data: { date?: string | null } }) => string`).
- Produces:
  - `SYNTHESIZE_MIN = 3`, `SYNTHESIZE_MAX = 5`, `SYNTHESIZE_LINE: string`
  - `synthesizable<T extends SynthesisRecord>(records: T[]): T[]` — qualifying conversations, newest first
  - `synthesizeLabel(count: number): string | null` — the button text, or `null` when the button shouldn't show
  - `type SynthesisRecord`

- [ ] **Step 1: Write the failing tests**

Create `web/src/core/synthesis.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SYNTHESIZE_LINE, synthesizable, synthesizeLabel, type SynthesisRecord } from "./synthesis";

const conv = (path: string, over: Partial<SynthesisRecord["data"]> = {}, notes = "Notes in the founder's words."): SynthesisRecord => ({
  path,
  data: { type: "customer", date: path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("/") + 11), observedBehavior: null, quotes: [], numbers: [], ...over },
  notes,
});

describe("synthesizable", () => {
  it("keeps confirmed customer and prospect conversations that record something, newest first", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md"),
      conv("conversations/2026-10-09-b.md", { type: "prospect" }),
      conv("conversations/2026-10-05-c.md", { type: "mentor" }),
      conv("conversations/2026-10-07-d.md", { seeded: true }),
      conv("conversations/2026-10-03-e.md", {}, ""),
      conv("conversations/2026-10-08-f.md", { quotes: ["I lose my Friday"] }, ""),
    ];
    expect(synthesizable(rows).map((r) => r.path)).toEqual(["conversations/2026-10-09-b.md", "conversations/2026-10-08-f.md", "conversations/2026-10-01-a.md"]);
  });
  it("falls back to the file-name date when the record has none, and sorts ties by path", () => {
    const rows = [conv("conversations/2026-10-02-zed.md", { date: null }), conv("conversations/2026-10-02-amy.md", { date: null }), conv("conversations/2026-10-04-kim.md", { date: null })];
    expect(synthesizable(rows).map((r) => r.path)).toEqual(["conversations/2026-10-04-kim.md", "conversations/2026-10-02-amy.md", "conversations/2026-10-02-zed.md"]);
  });
  it("does not cap the list; the skill reads the first five", () => {
    const rows = Array.from({ length: 7 }, (_, i) => conv(`conversations/2026-10-0${i + 1}-p.md`));
    expect(synthesizable(rows)).toHaveLength(7);
  });
});

describe("synthesizeLabel", () => {
  it("shows nothing under three", () => {
    expect(synthesizeLabel(0)).toBeNull();
    expect(synthesizeLabel(2)).toBeNull();
  });
  it("carries the real count from three to four", () => {
    expect(synthesizeLabel(3)).toBe("Synthesize your 3 conversations");
    expect(synthesizeLabel(4)).toBe("Synthesize your 4 conversations");
  });
  it("says last 5 from five up", () => {
    expect(synthesizeLabel(5)).toBe("Synthesize your last 5 conversations");
    expect(synthesizeLabel(12)).toBe("Synthesize your last 5 conversations");
  });
});

describe("SYNTHESIZE_LINE", () => {
  it("is the exact line AGENTS.md routes to the skill", () => {
    expect(SYNTHESIZE_LINE).toBe("Synthesize my last five customer conversations in Founderive.");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/core/synthesis.test.ts`
Expected: FAIL, "Failed to resolve import ./synthesis".

- [ ] **Step 3: Write the module**

Create `web/src/core/synthesis.ts`:

```ts
import type { ConversationType } from "../store/schemas";
import { isEvidenceEligible } from "./conversations";
import { conversationDate } from "./path";

/** What synthesis needs from a conversation: the evidence fields, a date and the notes body. */
export type SynthesisRecord = {
  path: string;
  data: { type: ConversationType; seeded?: boolean; date?: string | null; observedBehavior?: string | null; quotes?: string[]; numbers?: string[] };
  notes: string;
};

/** Under this many qualifying conversations there's nothing to synthesize, so Home shows no button. */
export const SYNTHESIZE_MIN = 3;
/** The skill reads at most this many; the label says "last 5" from here up. */
export const SYNTHESIZE_MAX = 5;
/**
 * The line the Home button types into the Claude panel. AGENTS.md routes a message starting with it to
 * .claude/skills/synthesize/SKILL.md, so the three must stay identical.
 */
export const SYNTHESIZE_LINE = "Synthesize my last five customer conversations in Founderive.";

/**
 * Conversations a synthesis can read: confirmed customer or prospect conversations that record something
 * (the one evidence predicate in core/conversations), newest first. Unknown dates fall back to the file name.
 * Not capped here: the count drives the label, and the skill takes the first SYNTHESIZE_MAX.
 */
export function synthesizable<T extends SynthesisRecord>(records: T[]): T[] {
  return records
    .filter((c) => isEvidenceEligible(c.data, c.notes))
    .sort((a, b) => conversationDate(b).localeCompare(conversationDate(a)) || a.path.localeCompare(b.path));
}

/** The Home button's text, or null when there's too little to synthesize. Never a shortfall. */
export function synthesizeLabel(count: number): string | null {
  if (count < SYNTHESIZE_MIN) return null;
  return count >= SYNTHESIZE_MAX ? `Synthesize your last ${SYNTHESIZE_MAX} conversations` : `Synthesize your ${count} conversations`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && pnpm test src/core/synthesis.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/synthesis.ts web/src/core/synthesis.test.ts
git commit -m "feat: core rule for which conversations a synthesis reads, and the button's label"
```

---

### Task 2: `loadToday()` carries the count

**Files:**
- Modify: `web/src/commands/today.ts` (the `TodayView` ready type near line 44, and the body near lines 148 and 191)
- Test: `web/src/commands/today.test.ts`

**Interfaces:**
- Consumes: `synthesizable()` from Task 1. `records.conversations` in `loadToday` is `{ path; data: KindData<"conversation">; notes }[]`, which satisfies `SynthesisRecord`.
- Produces: `synthesizable: number` on the ready `TodayView`, so `pnpm today --json` prints it and Home reads it.

- [ ] **Step 1: Write the failing test**

Add to the `describe("loadToday", …)` block in `web/src/commands/today.test.ts`, after the test named "counts logged customer conversations on the guide step, not advice":

```ts
  it("counts confirmed customer conversations with content as synthesizable, never advice or imports", async () => {
    await clearLoopRecords(env.dir);
    await createConversation({ ...DANA, followUps: [] });
    await createConversation({ ...DANA, person: "Lee Park", org: null, followUps: [] });
    await createConversation({ ...DANA, person: "Priya", followUps: [] }, { seeded: true, source: "import test" });
    await createConversation(MENTOR);
    expect((await ready()).synthesizable).toBe(2);
  });
```

`DANA` has a quote, a number and observed behavior, so each copy records something. `MENTOR` is advice. The seeded copy is an unconfirmed import.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && pnpm test src/commands/today.test.ts -t synthesizable`
Expected: FAIL, "expected undefined to be 2".

- [ ] **Step 3: Add the field**

In `web/src/commands/today.ts`, add the import after the `conversations` import on line 2:

```ts
import { synthesizable } from "../core/synthesis";
```

In the `TodayView` ready branch, after the `importedWaiting: number;` line, add:

```ts
      /** Confirmed customer conversations that record something: what a synthesis would read. Home shows the button from 3. */
      synthesizable: number;
```

In the body, right after `const importedWaiting = records.conversations.filter((c) => c.data.seeded).length;`, add:

```ts
  const synthesizableCount = synthesizable(records.conversations).length;
```

In the returned object, right after `importedWaiting,`, add:

```ts
    synthesizable: synthesizableCount,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && pnpm test src/commands/today.test.ts`
Expected: PASS, every test in the file (the new one included).

Then run: `cd web && pnpm -s today --json | grep synthesizable`
Expected: a line like `"synthesizable": 0,` (the number depends on the data folder).

- [ ] **Step 5: Commit**

```bash
git add web/src/commands/today.ts web/src/commands/today.test.ts
git commit -m "feat: today carries how many conversations a synthesis would read"
```

---

### Task 3: The Home button

**Files:**
- Create: `web/src/components/home/SynthesizeButton.tsx`
- Modify: `web/src/app/(workbook)/today/page.tsx` (imports near line 6, destructuring near line 42, JSX after the agent-edits paragraph near line 111)

**Interfaces:**
- Consumes: `askClaude(text)` from `web/src/components/claude/askClaude.ts` (dispatches a window event; the panel opens and types `text` without Enter). `buttonQuiet` from `web/src/components/workbook/form.ts`. `synthesizeLabel`, `SYNTHESIZE_LINE` from Task 1. `view.synthesizable` from Task 2.
- Produces: `<SynthesizeButton count={number} />`, which renders nothing when the label is null.

There are no component render tests in this repo (no `*.test.tsx`), so the label and threshold logic was tested in Task 1 and this task is verified in the browser.

- [ ] **Step 1: Write the component**

Create `web/src/components/home/SynthesizeButton.tsx`:

```tsx
"use client";

import { askClaude } from "@/components/claude/askClaude";
import { buttonQuiet } from "@/components/workbook/form";
import { SYNTHESIZE_LINE, synthesizeLabel } from "@/core/synthesis";

/**
 * Types the synthesis line into the Claude panel; the founder presses Enter. Shows only from three qualifying
 * conversations (core/synthesis decides), and never becomes Home's main action.
 */
export function SynthesizeButton({ count }: { count: number }) {
  const label = synthesizeLabel(count);
  if (!label) return null;
  return (
    <p className="mb-4 text-sm text-muted">
      <button type="button" className={buttonQuiet} onClick={() => askClaude(SYNTHESIZE_LINE)}>
        {label}
      </button>{" "}
      Claude reads them and drafts themes for you to confirm.
    </p>
  );
}
```

- [ ] **Step 2: Render it on Home**

In `web/src/app/(workbook)/today/page.tsx`:

Add the import after `import { PathList } from "@/components/home/PathList";`:

```tsx
import { SynthesizeButton } from "@/components/home/SynthesizeButton";
```

In the destructuring line that begins `const { founder: f, today, weekId, …`, add `synthesizable` after `importedWaiting`:

```tsx
  const { founder: f, today, weekId, weekStartsOn, checkinEntry, checkin, programWeek, homework, report, carried, path, talkedTo, importedWaiting, synthesizable, agentEditsWaiting, changesWaiting, dueItems, action } = view;
```

Insert the button directly after the agent-edits paragraph and before `<div className="grid gap-4 md:grid-cols-3">`. The result reads:

```tsx
      {agentEditsWaiting.count > 0 && agentEditsWaiting.href && (
        <p className="mb-4 text-sm text-muted">
          <Link href={agentEditsWaiting.href} className="font-medium text-teal-dark hover:text-navy">
            Review {agentEditsWaiting.count} agent edit{agentEditsWaiting.count === 1 ? "" : "s"}
          </Link>
        </p>
      )}
      <SynthesizeButton count={synthesizable} />
      <div className="grid gap-4 md:grid-cols-3">
```

- [ ] **Step 3: Type-check and lint**

Run: `cd web && pnpm -s tsc --noEmit && pnpm lint`
Expected: no errors. (If `tsc` isn't on the path, `pnpm exec tsc --noEmit`.)

- [ ] **Step 4: Check it in the browser**

Start the app from the repo root: `node start.mjs` (in the background; skip if `FOUNDERIVE_PANEL=1` is set, Founderive is already running). Open Home.

- With fewer than three qualifying conversations in the data folder: no button appears between the agent-edits line and the three tiles.
- With three or more (log them on People with a quote each if needed): the button reads "Synthesize your 3 conversations" (or "last 5" at five or more). Clicking it opens the Claude panel. If Claude or Codex is running, the line is typed in and not sent. If nothing is running, the line waits above the terminal as a draft.
- Home's main action is unchanged by the button.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/home/SynthesizeButton.tsx "web/src/app/(workbook)/today/page.tsx"
git commit -m "feat: Home offers to synthesize the last five conversations through the Claude panel"
```

---

### Task 4: The `synthesize` skill

**Files:**
- Create: `.claude/skills/synthesize/SKILL.md`

**Interfaces:**
- Consumes: `pnpm -s data-dir` for the data folder; the conversation and decision schemas as documented in `AGENTS.md` ("File kinds").
- Produces: one file `<data>/decisions/<today>-synthesis-<slug>.md` in the shape below. Task 5 routes to this file.

The skill is prose. Its test is the dry run in Task 6.

- [ ] **Step 1: Write the skill**

Create `.claude/skills/synthesize/SKILL.md`:

````markdown
---
name: synthesize
description: Read the founder's last five confirmed customer conversations and draft three themes with counts and quotes, two product implications and one message to test, for the founder to confirm, then write one open decision record. Use when a founder says "synthesize my conversations", "what do my last five conversations add up to", or sends the line Founderive's Home button types.
---

# Synthesize the last five conversations

One loud interview isn't a strategy. This skill reads five conversations together, counts what repeats, keeps what contradicts, and lands the result where the founder can decide on it. You count and draft. The founder decides what counts as a pattern.

## Find the data folder

Run `pnpm -s data-dir` from the repo's `web/` folder, first, before reading or writing anything. It prints the absolute path of the founder's data folder. Below, `<data>` means that path: use it for every read and write, and never assume `founder-data/` or any other hard-coded folder name.

## What counts

A conversation qualifies when all three hold:

- `type` is `customer` or `prospect` (mentor, partner, investor and other are advice, not evidence)
- `seeded` is absent (an unconfirmed import doesn't count until the founder confirms it on People)
- it records something: notes in the body, `observedBehavior`, a quote or a number

`pnpm -s today --json` from `web/` prints `synthesizable`, the count the app uses; your reading should match it.

## Steps

1. **Read the conversations.** Every file in `<data>/conversations/`. Keep the ones that qualify, newest first by `date` (fall back to the date in the file name when `date` is missing). Take the first five. Read each one's frontmatter and body. Say who they were in one line, with companies counted: "Dana, Marcus, a clinic owner, Priya and Tom, 2 Oct to 14 Oct, at 3 companies." A conversation with no `org` counts as its own company. Fewer than three qualify: say so, say what would make one count (confirm it on People, or add a quote, a number or notes), and stop.
2. **Read the Customer step.** `<data>/canvas/customer.md` if it exists. Its `text` is what the founder believes now; you'll compare the conversations against it and copy it into `beliefBefore`.
3. **Draft three themes.** For each:
   - a short name in the founder's kind of words
   - "heard from N of 5 at M companies" (M is distinct `org` values; no `org` counts as its own)
   - the exact quotes, numbers or observed behavior behind it, each attributed to its person, and each labelled as what they said, what they do, or what they paid or committed. Prefer did and paid over said.
   - A theme needs at least two people. Anything heard once goes in a separate "heard once" list so the founder sees it but doesn't build on it.
   - When every person behind a theme is at one company, or the founder's notes say they all came through one introduction, say so in one sentence beside the theme: "All three are at Bright Home Care, so this is one account's view."
   - Anything that cuts against the Customer step's text, or against another theme, goes in a "what contradicts" list with the same attribution. Never drop a negative case.
4. **Confirm the themes, one turn each.** For each theme ask: keep it, rename it, or drop it? Keep the founder's wording. Don't propose a fourth unless they drop one and ask for another.
5. **Implications and the message, one turn each.** From the confirmed themes, draft two product implications and one message to test this week, in customer language taken from the quotes. The founder confirms or rewrites each.
6. **Next decision and decide-by.** Ask: "What decision do these themes put in front of you now, in one line?" Then: "When will you make it?" (a real date). The line becomes the record's title.
7. **Write one decision record** at `<data>/decisions/<today>-synthesis-<slug>.md`, where `<slug>` is a lowercase-hyphen slug of the title. Never overwrite; add `-2` if the name exists.

   ```markdown
   ---
   title: <the next decision needed, in the founder's words>
   date: <today>
   status: open
   decideBy: <the date they gave>
   area: customer
   beliefBefore: <the Customer step's current text, verbatim; leave the line out when there is none>
   evidence:
     - conversations/2026-10-14-dana.md
     - conversations/2026-10-12-marcus.md
     - conversations/2026-10-10-clinic-owner.md
     - conversations/2026-10-06-priya.md
     - conversations/2026-10-02-tom.md
   alternatives:
     - "Workflow pain (4 of 5, 3 companies): the schedule is rebuilt by hand every week"
     - "Budget owner (3 of 5, 2 companies): the owner pays, not the office manager"
     - "Switching friction (2 of 5, 1 company): the spreadsheet is shared with payroll"
   seeded: true
   source: synthesize draft <today>
   ---
   ## What we heard most often
   <each confirmed theme with its attributed quotes, numbers and behavior; the one-source note where it applies>

   ## What contradicts
   <evidence against the Customer step's text or against a theme, attributed; write "Nothing in these five." when empty>

   ## What surprised us
   <in the founder's words; ask if they haven't said>

   ## What we should change
   <the two product implications>

   ## What we should not change yet
   <in the founder's words; ask if they haven't said>

   ## Message to test this week
   "<the one message, in customer language>"

   ## Heard once
   <one line per item, attributed; write "Nothing." when empty>
   ```

   Rules for the record:
   - `area` is `customer` only when the founder uses the shipped canvas. A founder with their own `canvas/blocks.md` gets no `area` line, because the decision schema accepts only the seven shipped ids (customer, problem, solution, channel, revenue, cost, feasibility).
   - `alternatives` holds the themes because the schema has no themes field and the themes are what the founder is choosing between.
   - `status` stays `open`. Never write `decision`, `why` or `reversible`; the founder resolves it on Decisions.
   - `seeded: true` because you drafted it. The app shows it as "Imported — confirm" until the founder confirms it. Never clear it.
8. **Offer a follow-up, don't force it.** Ask once: turn the message into a test (`.claude/skills/new-test/SKILL.md`), or add a commitment to this week's check-in `{ id, text: "Test: <message>", due, status: open, link: "decisions/<the file name>" }`? Only if the founder says yes.
9. **Run `pnpm check-data`** from `web/` and fix what it flags. Close with one short summary: the three themes with counts and companies, what contradicts (or that nothing did), the message, the decide-by date, and that the record waits on Decisions.

## Never

- Tag conversations with themes or edit any conversation. Editing a confirmed conversation starts the agent-edit review on every one of the five; not worth it for a tag the app doesn't read.
- Edit the Customer step's text or any canvas block.
- Set `decision`, `why` or `reversible`, or clear `seeded`.
- Invent a quote, round a number, or merge two people's words into one.
- Score intensity or urgency. Counts and evidence kind (said, did, paid) are the only ranking.
- Show a count as a shortfall.
````

- [ ] **Step 2: Check the record shape against the schema**

In a scratch data folder (or the real one, then move the file to `_archive/`), write the example record from Step 1 with five real conversation paths that exist, and run `cd web && pnpm -s check-data`.
Expected: no error on the decisions file. A warning about an evidence path means a path in `evidence` doesn't exist; fix the path, not the schema.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/synthesize/SKILL.md
git commit -m "feat: synthesize skill drafts themes from the last five conversations into one open decision"
```

---

### Task 5: Route the line and document the skill

**Files:**
- Modify: `AGENTS.md` (line 17, the panel paragraph; line 100, the weekly review question 4; the Prompts table after line 153)
- Modify: `docs/product/synthesis-direction.md` (the "Agent instructions" section)

**Interfaces:**
- Consumes: `SYNTHESIZE_LINE` text from Task 1 (verbatim), the skill from Task 4.
- Produces: the agent, in the panel or elsewhere, follows the skill when it sees the line.

- [ ] **Step 1: Route the line**

In `AGENTS.md`, the paragraph on line 17 ends with `…and its planned conversations) before answering.` Append one sentence to that paragraph:

```markdown
 A message starting "Synthesize my last five customer conversations in Founderive" means follow `.claude/skills/synthesize/SKILL.md`.
```

- [ ] **Step 2: Read a synthesis back in the weekly review**

In `AGENTS.md`, under "### The weekly review", the paragraph beginning `Before question 6, read every outreach audience row…` gets this sentence added at its start:

```markdown
Before question 4, when a decision whose `source` starts with `synthesize draft` is dated in the past week, read its themes (the `alternatives` list) back in one line, then ask.
```

- [ ] **Step 3: Add the Prompts row**

In the Prompts table in `AGENTS.md`, after the `log-conversation` row, add:

```markdown
| Make sense of the last five customer conversations | `.claude/skills/synthesize/SKILL.md` (Claude: `/synthesize`) |
```

- [ ] **Step 4: Amend the brief**

The brief's "Agent instructions" section says `web/src/lib/prompts.ts` gets a `SKILL_PROMPTS` entry. No page would show it (the three existing entries each back one page's copy-a-prompt box, and Home has the button instead), so it would be a dead constant. Replace that paragraph in `docs/product/synthesis-direction.md` with:

```markdown
No entry in `SKILL_PROMPTS` (`web/src/lib/prompts.ts`): nothing shows it, since Home has the button and the panel on Windows already tells the founder to use their own terminal. A founder without the panel types the same line, which `AGENTS.md` routes.
```

- [ ] **Step 5: Check the three copies of the line match**

Run from the repo root:

```bash
grep -c "Synthesize my last five customer conversations in Founderive" AGENTS.md web/src/core/synthesis.ts .claude/skills/synthesize/SKILL.md
```

Expected: each file reports at least 1.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md docs/product/synthesis-direction.md
git commit -m "docs: route the synthesis line to the skill and read a synthesis back in the weekly review"
```

---

### Task 6: Dry run in the panel

**Files:** none changed unless the run finds a defect; then fix in the task that owns the file and commit there.

This is the skill's test. It needs a data folder with at least six confirmed customer conversations, two at the same `org`, and one whose notes cut against the Customer step's text. Use a scratch data folder (`pnpm init-data` from `web/` creates an empty one; the root `README.md` says how the data folder is chosen), not a real founder's.

- [ ] **Step 1: Prepare the data**

Six customer conversations in `<data>/conversations/`, each with a quote, none `seeded`. Two share `org: Bright Home Care`. One has notes saying the problem doesn't happen for them. `<data>/canvas/customer.md` has a `text`.

- [ ] **Step 2: Run it**

Start Founderive, open Home, confirm the button reads "Synthesize your last 5 conversations", start Claude in the panel, click the button, press Enter. Answer the questions.

- [ ] **Step 3: Check the result against the brief's test list**

- It read five, not six, and named them with a company count.
- Every theme cites two or more people and says "N of 5 at M companies".
- The theme whose people are all at Bright Home Care carries the one-source sentence.
- The contradicting conversation appears under "What contradicts".
- It asked one question per turn and kept your wording.
- `pnpm -s check-data` from `web/` passes.
- Decisions shows the record as "Imported — confirm", open, with the themes under alternatives and the five conversations linked.
- No conversation file and no canvas file changed (`git status` in the data folder, if it's a git repo, or file mtimes).

- [ ] **Step 4: Record the outcome**

Add one line under "## Tests" in `docs/product/synthesis-direction.md`: `Dry run <date>: passed` or what failed and which task fixed it. Commit:

```bash
git add docs/product/synthesis-direction.md
git commit -m "docs: synthesis dry run result"
```

---

## Self-review

- **Spec coverage.** Home button, threshold, label, states → Tasks 1 and 3. `synthesizable` in `loadToday()` and the JSON → Task 2. Skill steps 1 to 9, record shape, company counts, contradicts list, one-source note, never-list → Task 4. AGENTS.md line, Prompts row, weekly review → Task 5. `SKILL_PROMPTS` → deliberately dropped in Task 5 with the brief amended. Tests listed in the brief → Tasks 1, 2 and 6. "Later, if it earns its place" → out of scope, correctly.
- **Deviation from the brief.** The brief puts `synthesizable()` in `core/conversations.ts`; the plan puts it in a new `core/synthesis.ts` with the label and the line, so the three things that must stay in step live in one file. The brief's "Code" section should be read with that substitution; Task 5 doesn't edit it because it's a file-location detail, not a behavior.
- **Placeholders.** None. Every code step shows the code.
- **Type consistency.** `synthesizable<T extends SynthesisRecord>(records: T[]): T[]` in Task 1; called with `records.conversations` in Task 2, whose element type has `path`, `data` (with `type`, `seeded?`, `date?`, `observedBehavior?`, `quotes`, `numbers`) and `notes`. `synthesizeLabel(count: number): string | null` in Tasks 1 and 3. `SYNTHESIZE_LINE` in Tasks 1, 3, 5. `view.synthesizable: number` in Tasks 2 and 3.
