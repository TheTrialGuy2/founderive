# Stance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the founder confirms what a conversation changes, they also say whether it supports or challenges what they believe; the step page counts the split and lists the challengers, and a decision can cite evidence against it.

**Architecture:** One optional enum field (`stance`) on a conversation and one link list (`against`) on a decision, both in `web/src/store/schemas.ts`. One pure core module (`web/src/core/stance.ts`) does the counting, the ordering and the chip text, so the step page and any later caller agree. The existing "What this changes" form gains a radio row and its command refuses a confirmation without a stance. The decision form's evidence checklist becomes two. No new page, no new file kind, no change to Home.

**Tech Stack:** Next 16 (Cache Components, `await connection()` inside `<Suspense>`), React 19, TypeScript, Zod 4 schemas in `web/src/store/schemas.ts`, Vitest (`pnpm test` from `web/`), pnpm.

Spec: `docs/product/stance-direction.md`. Read it first.

## Global Constraints

- Everything under `web/` runs from `web/`: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm -s check-data`.
- `web/src/store/` is the only code that reads or writes founder-data. Core modules are pure and take records as arguments.
- The founder decides. Only the founder's form sets `stance`. No command, skill or import writes it. `createConversation` never sets it; `updateConversation` keeps it (it spreads the existing record).
- Confirming "what this changes" requires a stance from now on: `confirmWhatChanges(rel, whatChanges, stance)` refuses a missing or unknown stance. The schema does **not** require it, so older confirmed files stay valid.
- `neither` is a real answer. It counts in neither lane.
- Exact copy, used verbatim:
  - Radio legend: `Does it support what you believe?`
  - Options: `Supports it`, `Challenges it`, `Neither yet`
  - Missing-stance error: `Say whether it supports or challenges what you believe, or neither yet.`
  - Older-record line: `Say whether it supports or challenges what you believe.`
  - Chip: `4 people discussed this · 3 support · 1 challenges` (a zero lane is left out; singular agreement: `1 supports`, `1 challenges`; plural: `3 support`, `2 challenge`).
  - Step section heading: `What challenges this · N`.
  - Decision checklists: `Evidence for (optional)`, `Evidence against (optional)`. Card lists: `Evidence for · N`, `Against · N`.
  - Both-lists error: `A record can be for or against, not both.`
- Meaning never relies on colour. The heading carries it; the challengers list is a list, not a warning.
- Counts in words, never a shortfall, never a score.
- Commit after every task. Branch: `feat/stance` (already exists, holds the brief).
- No React rendering tests exist in this codebase. Components are checked by `pnpm lint`, `pnpm exec tsc --noEmit` and the manual check in Task 8. Behaviour lives in commands and core, which are tested.

---

### Task 1: The `stance` field and its labels

**Files:**
- Modify: `web/src/store/schemas.ts` (the constants block near `CONVERSATION_TYPES`, and `conversationSchema`)
- Modify: `web/src/lib/loop-labels.ts`
- Test: `web/src/store/loop-schemas.test.ts`

**Interfaces:**
- Produces:
  - `STANCES = ["supports", "challenges", "neither"] as const` and `type Stance = (typeof STANCES)[number]` from `web/src/store/schemas.ts`
  - `conversationSchema` output gains `stance?: Stance | null`
  - `STANCE_LABELS: Record<Stance, string>` from `web/src/lib/loop-labels.ts`

- [ ] **Step 1: Write the failing tests**

In `web/src/store/loop-schemas.test.ts`, inside `describe("conversation", …)`, after the test `"can't be confirmed without saying what changes"`, add:

```ts
  it("takes a stance of supports, challenges or neither, and nothing else", () => {
    for (const stance of ["supports", "challenges", "neither"]) expect(paths(conversationSchema, conversation({ stance }))).toEqual([]);
    expect(paths(conversationSchema, conversation({ stance: "against" }))).toEqual(["stance"]);
  });
  it("an older confirmed record without a stance stays valid and reads as not said yet", () => {
    expect(conversationSchema.parse(conversation({ whatChanges: "Price ceiling near $300", whatChangesConfirmed: true })).stance).toBeUndefined();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/store/loop-schemas.test.ts`
Expected: FAIL. The first new test fails on `stance: "against"` with `[]` instead of `["stance"]` (an unknown key is rejected by `strictObject`, so the valid values fail too: `["stance"]` instead of `[]`).

- [ ] **Step 3: Add the constant, the type and the field**

In `web/src/store/schemas.ts`, after the line `export const EVIDENCE_STRENGTHS = […] as const;` add:

```ts
export const STANCES = ["supports", "challenges", "neither"] as const;
```

After `export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];` add:

```ts
export type Stance = (typeof STANCES)[number];
```

In `conversationSchema`, after the line `whatChangesConfirmed: z.boolean().default(false),` add:

```ts
    // The founder's call on the conversation as a whole: does it support what they believe about the steps it's tagged
    // with, challenge it, or neither yet. Set with whatChanges, only through the app's form. Absent on older records.
    stance: z.enum(STANCES).nullish(),
```

- [ ] **Step 4: Add the labels**

In `web/src/lib/loop-labels.ts`, change the first import line to:

```ts
import type { Area, CanvasStatus, ConversationType, EvidenceStrength, Stance, TestDecision, TestResult, TestStatus } from "../store/schemas";
```

After the `TYPE_LABELS` line add:

```ts
export const STANCE_LABELS: Record<Stance, string> = { supports: "Supports it", challenges: "Challenges it", neither: "Neither yet" };
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd web && pnpm test src/store/loop-schemas.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 6: Commit**

```bash
git add web/src/store/schemas.ts web/src/lib/loop-labels.ts web/src/store/loop-schemas.test.ts
git commit -m "feat: a conversation may carry the founder's stance"
```

---

### Task 2: Core module, counts, challengers and the chip

**Files:**
- Create: `web/src/core/stance.ts`
- Test: `web/src/core/stance.test.ts`

**Interfaces:**
- Consumes: `discussesStep(c, stepId)`, `conversationDate(c)` and `type PathConversation = { path: string; data: KindData<"conversation">; notes: string }` from `web/src/core/path.ts`.
- Produces:
  - `type StanceCounts = { supports: number; challenges: number }`
  - `byNewest(a, b)`: comparator, newest first by `conversationDate`, then by path
  - `stanceCounts(conversations: PathConversation[], stepId: string): StanceCounts`
  - `challengers<T extends PathConversation>(conversations: T[], stepId: string): T[]` (newest first)
  - `chipText(discussed: number, counts: StanceCounts, tested: boolean, conversations: boolean): string`

- [ ] **Step 1: Write the failing tests**

Create `web/src/core/stance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PathConversation } from "./path";
import { byNewest, challengers, chipText, stanceCounts } from "./stance";

const conv = (path: string, over: Partial<PathConversation["data"]> = {}, notes = "Notes in the founder's words."): PathConversation => ({
  path,
  data: {
    type: "customer",
    person: "Dana",
    date: path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("/") + 11),
    quotes: [],
    numbers: [],
    followUps: [],
    relatedTests: [],
    areas: ["problem"],
    whatChangesConfirmed: false,
    ...over,
  },
  notes,
});

describe("stanceCounts", () => {
  it("counts supports and challenges among feedback conversations on the step; neither and unset count in neither lane", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { stance: "supports" }),
      conv("conversations/2026-10-02-b.md", { stance: "supports" }),
      conv("conversations/2026-10-03-c.md", { stance: "challenges" }),
      conv("conversations/2026-10-04-d.md", { stance: "neither" }),
      conv("conversations/2026-10-05-e.md"),
    ];
    expect(stanceCounts(rows, "problem")).toEqual({ supports: 2, challenges: 1 });
  });
  it("ignores advice, unconfirmed imports, conversations with nothing recorded and conversations off the step", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { type: "mentor", stance: "challenges" }),
      conv("conversations/2026-10-02-b.md", { seeded: true, stance: "challenges" }),
      conv("conversations/2026-10-03-c.md", { stance: "challenges" }, ""),
      conv("conversations/2026-10-04-d.md", { areas: ["revenue"], stance: "challenges" }),
      conv("conversations/2026-10-05-e.md", { stance: "supports" }),
    ];
    expect(stanceCounts(rows, "problem")).toEqual({ supports: 1, challenges: 0 });
  });
  it("an untagged conversation counts for the customer step, as discussesStep says", () => {
    expect(stanceCounts([conv("conversations/2026-10-01-a.md", { areas: [], stance: "challenges" })], "customer")).toEqual({ supports: 0, challenges: 1 });
  });
});

describe("challengers", () => {
  it("returns the challenging feedback conversations on the step, newest first, by file date when the date is unknown", () => {
    const rows = [
      conv("conversations/2026-10-01-a.md", { stance: "challenges" }),
      conv("conversations/2026-10-09-b.md", { stance: "challenges", date: null }),
      conv("conversations/2026-10-05-c.md", { stance: "supports" }),
      conv("conversations/2026-10-07-d.md", { stance: "challenges", type: "investor" }),
      conv("conversations/2026-10-03-e.md", { stance: "challenges" }),
    ];
    expect(challengers(rows, "problem").map((r) => r.path)).toEqual(["conversations/2026-10-09-b.md", "conversations/2026-10-03-e.md", "conversations/2026-10-01-a.md"]);
  });
  it("byNewest breaks a date tie by path so the order is stable", () => {
    const rows = [conv("conversations/2026-10-02-zed.md"), conv("conversations/2026-10-02-amy.md"), conv("conversations/2026-10-04-kim.md")];
    expect([...rows].sort(byNewest).map((r) => r.path)).toEqual(["conversations/2026-10-04-kim.md", "conversations/2026-10-02-amy.md", "conversations/2026-10-02-zed.md"]);
  });
});

describe("chipText", () => {
  const none = { supports: 0, challenges: 0 };
  it("reads as today with no stances", () => {
    expect(chipText(4, none, false, false)).toBe("4 people discussed this");
    expect(chipText(1, none, false, false)).toBe("1 person discussed this");
    expect(chipText(0, none, false, true)).toBe("Your guess · not discussed yet");
    expect(chipText(0, none, false, false)).toBe("Your guess");
  });
  it("a supported test still outranks talk", () => {
    expect(chipText(4, { supports: 3, challenges: 1 }, true, false)).toBe("Tested · supported");
  });
  it("adds each lane that has anyone in it and drops a zero", () => {
    expect(chipText(4, { supports: 3, challenges: 1 }, false, false)).toBe("4 people discussed this · 3 support · 1 challenges");
    expect(chipText(4, { supports: 2, challenges: 0 }, false, false)).toBe("4 people discussed this · 2 support");
    expect(chipText(3, { supports: 0, challenges: 2 }, false, true)).toBe("3 people discussed this · 2 challenge");
    expect(chipText(3, { supports: 1, challenges: 2 }, false, false)).toBe("3 people discussed this · 1 supports · 2 challenge");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/core/stance.test.ts`
Expected: FAIL with "Failed to resolve import "./stance"".

- [ ] **Step 3: Write the module**

Create `web/src/core/stance.ts`:

```ts
import { conversationDate, discussesStep, type PathConversation } from "./path";

/** How the people who discussed a step split. `neither` and a missing stance are in neither lane. */
export type StanceCounts = { supports: number; challenges: number };

/** Newest first by when they talked (the file date when the date is unknown), then by path so the order is stable. */
export const byNewest = <T extends { path: string; data: { date?: string | null } }>(a: T, b: T): number =>
  conversationDate(b).localeCompare(conversationDate(a)) || a.path.localeCompare(b.path);

/**
 * Counts the founder's stances among the feedback conversations that discussed a step. discussesStep is the one rule
 * for who counts, so advice, unconfirmed imports, conversations with nothing recorded and conversations tagged with
 * other steps are never looked at. The founder set each stance; nothing here infers one.
 */
export function stanceCounts(conversations: PathConversation[], stepId: string): StanceCounts {
  const counts: StanceCounts = { supports: 0, challenges: 0 };
  for (const c of conversations) {
    if (!discussesStep(c, stepId)) continue;
    if (c.data.stance === "supports") counts.supports++;
    else if (c.data.stance === "challenges") counts.challenges++;
  }
  return counts;
}

/** The feedback conversations on a step the founder marked as challenging what they believe, newest first. */
export function challengers<T extends PathConversation>(conversations: T[], stepId: string): T[] {
  return conversations.filter((c) => discussesStep(c, stepId) && c.data.stance === "challenges").sort(byNewest);
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The step chip. A supported test still outranks talk. Otherwise the people count, then each stance lane that has
 * anyone in it ("4 people discussed this · 3 support · 1 challenges"); with no stances it reads as it always did.
 * Only the Customer step (`conversations`) says when nobody has discussed it yet.
 */
export function chipText(discussed: number, counts: StanceCounts, tested: boolean, conversations: boolean): string {
  if (tested) return "Tested · supported";
  if (discussed === 0) return conversations ? "Your guess · not discussed yet" : "Your guess";
  const parts = [`${count(discussed, "person", "people")} discussed this`];
  if (counts.supports > 0) parts.push(count(counts.supports, "supports", "support"));
  if (counts.challenges > 0) parts.push(count(counts.challenges, "challenges", "challenge"));
  return parts.join(" · ");
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && pnpm test src/core/stance.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/core/stance.ts web/src/core/stance.test.ts
git commit -m "feat: stance counts, challengers and the step chip text"
```

---

### Task 3: Confirming "what this changes" takes a stance

**Files:**
- Modify: `web/src/commands/conversations.ts` (imports; `confirmWhatChanges`)
- Modify: `web/src/app/(workbook)/conversations/actions.ts` (`confirmWhatChangesAction`)
- Modify: `web/src/components/workbook/form.ts` (add `radioChip`)
- Modify: `web/src/components/conversations/WhatChangesForm.tsx`
- Modify: `web/src/app/(workbook)/conversations/[slug]/page.tsx` (the "What this changes" card)
- Test: `web/src/commands/conversations.test.ts`

**Interfaces:**
- Consumes: `STANCES`, `type Stance` (Task 1); `STANCE_LABELS` and `options` from `web/src/lib/loop-labels.ts`; `oneOf(list, v)` and `required(value, message)` from `web/src/commands/form.ts`; `field(fd, key)` and `run(work, values)` from `web/src/app/(workbook)/action-utils.ts`.
- Produces:
  - `confirmWhatChanges(rel: string, whatChanges: string, stance: string): Promise<void>`
  - `STANCE_MESSAGE: string` from `web/src/commands/conversations.ts`
  - `radioChip: string` from `web/src/components/workbook/form.ts`
  - `WhatChangesForm` props: `{ path: string; initial: string; initialStance: Stance | null; confirmed: boolean }`

- [ ] **Step 1: Write the failing tests**

In `web/src/commands/conversations.test.ts`, change the import from `./conversations` to also bring in `STANCE_MESSAGE`:

```ts
import { addFollowUp, archiveImportedConversation, confirmAllImportedConversations, confirmImportedConversation, confirmWhatChanges, createConversation, loadConversation, loadConversations, parseConversationForm, setFollowUpStatus, STANCE_MESSAGE, updateConversation } from "./conversations";
```

Replace the test `"confirms what this changes only with text"` (inside `describe("conversation commands", …)`) with these two:

```ts
  it("confirms what this changes only with text and a stance, and writes both", async () => {
    const rel = await createConversation(DANA);
    expect(await readFile(path.join(env.dir, rel), "utf8")).not.toMatch(/stance/); // logging never sets one
    await expect(confirmWhatChanges(rel, "", "supports")).rejects.toThrow(/changes/);
    await expect(confirmWhatChanges(rel, "Owners feel it every week", "")).rejects.toThrow(STANCE_MESSAGE);
    await expect(confirmWhatChanges(rel, "Owners feel it every week", "against")).rejects.toThrow(STANCE_MESSAGE);
    let e = await readEntry("conversation", rel);
    expect(e?.ok && e.data).toMatchObject({ whatChangesConfirmed: false });
    await confirmWhatChanges(rel, "Owners feel it every week", "challenges");
    e = await readEntry("conversation", rel);
    expect(e?.ok && e.data).toMatchObject({ whatChanges: "Owners feel it every week", stance: "challenges", whatChangesConfirmed: true });
  });
  it("editing details keeps the stance", async () => {
    const rel = await createConversation(DANA);
    await confirmWhatChanges(rel, "Owners feel it every week", "supports");
    await updateConversation(rel, { ...DANA, person: "Dana" });
    const e = await readEntry("conversation", rel);
    expect(e?.ok && e.data).toMatchObject({ person: "Dana", stance: "supports", whatChangesConfirmed: true });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/commands/conversations.test.ts`
Expected: FAIL. `STANCE_MESSAGE` is undefined, and `confirmWhatChanges(rel, "Owners feel it every week", "")` resolves instead of rejecting.

- [ ] **Step 3: Change the command**

In `web/src/commands/conversations.ts`, change the schemas import to:

```ts
import { BLOCK_ID_PATTERN, CONVERSATION_TYPES, KINDS, STANCES, type ConversationType, type KindData, type TestStatus } from "../store/schemas";
```

Replace the whole `confirmWhatChanges` function (and its doc comment) with:

```ts
export const STANCE_MESSAGE = "Say whether it supports or challenges what you believe, or neither yet.";

/**
 * Records the founder's own reading of what this conversation changes and which way it cuts. Claude may draft the
 * text; only this confirms it, and a confirmation always carries a stance (supports, challenges or neither yet), so
 * every interpretation confirmed from now on has a direction. Older confirmed records without one stay as they are
 * until the founder changes them here.
 */
export async function confirmWhatChanges(rel: string, whatChanges: string, stance: string): Promise<void> {
  const t = required(whatChanges, "Say what this conversation changes, even if it's “nothing yet”.");
  if (!oneOf(STANCES, stance)) throw new Error(STANCE_MESSAGE);
  await updateEntry("conversation", rel, (data, body) => {
    if (!data) throw missing(rel);
    return { data: { ...data, whatChanges: t, stance, whatChangesConfirmed: true }, body };
  });
}
```

(`oneOf` is a type predicate, so `stance` is a `Stance` after the throw.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && pnpm test src/commands/conversations.test.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Pass the stance through the action**

In `web/src/app/(workbook)/conversations/actions.ts`, replace `confirmWhatChangesAction` with:

```ts
export async function confirmWhatChangesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  // Both fields come back on an error, so the founder keeps the text they typed and the stance they picked.
  const values = { whatChanges: field(fd, "whatChanges"), stance: field(fd, "stance") };
  return run(() => confirmWhatChanges(field(fd, "path"), values.whatChanges, values.stance), values);
}
```

- [ ] **Step 6: Share the chip style**

In `web/src/components/workbook/form.ts`, append:

```ts
/** A radio or checkbox option shown as a chip; the chosen one gets the teal border. */
export const radioChip = "flex min-h-10 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink has-[:checked]:border-teal-dark has-[:checked]:bg-aqua/40";
```

- [ ] **Step 7: Add the radio row to the form**

Replace the whole of `web/src/components/conversations/WhatChangesForm.tsx` with:

```tsx
"use client";

import { useActionState } from "react";
import { confirmWhatChangesAction } from "@/app/(workbook)/conversations/actions";
import { buttonPrimary, buttonQuiet, errorText, inputClass, radioChip } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { options, STANCE_LABELS } from "@/lib/loop-labels";
import type { Stance } from "@/store/schemas";

/**
 * The founder's own reading of what the conversation changes, and which way it cuts. Unconfirmed, this is the
 * screen's primary action. The stance is required: the command refuses a confirmation without one.
 */
export function WhatChangesForm({ path, initial, initialStance, confirmed }: { path: string; initial: string; initialStance: Stance | null; confirmed: boolean }) {
  const [state, formAction, pending] = useActionState(confirmWhatChangesAction, IDLE);
  const stance = state.values?.stance ?? initialStance ?? "";
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="path" value={path} />
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-ink">Does it support what you believe?</legend>
        <div className="flex flex-wrap gap-2">
          {options(STANCE_LABELS).map(([value, label]) => (
            <label key={value} className={radioChip}>
              <input type="radio" name="stance" value={value} defaultChecked={stance === value} /> {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="whatChanges" className="mb-1 block text-sm font-medium text-ink">
          {confirmed ? "What changed, in your words" : "What did this change for you?"}
        </label>
        <textarea
          id="whatChanges"
          name="whatChanges"
          rows={3}
          defaultValue={state.values?.whatChanges ?? initial}
          placeholder="Owners feel this every week, and the price ceiling may be near $300 a month"
          className={inputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={confirmed ? buttonQuiet : buttonPrimary}>
        {pending ? "Saving…" : "Confirm what changed"}
      </button>
      {state.status === "error" && (
        <p role="alert" className={errorText}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 8: Show the stance on the card**

In `web/src/app/(workbook)/conversations/[slug]/page.tsx`, change the labels import to:

```ts
import { areaLabel, STANCE_LABELS, STATUS_LABELS, TYPE_LABELS } from "@/lib/loop-labels";
```

Replace the contents of the `What this changes` card, from `{confirmed ? (` down to the closing `)}` before `{confirmed && returnTo && (`, with:

```tsx
          {confirmed ? (
            <>
              <p className="text-ink">{c.stance ? `${STANCE_LABELS[c.stance]} · ${c.whatChanges}` : c.whatChanges}</p>
              {/* A record confirmed before stances existed. It counts as "discussed" as before; the founder adds the stance under Change it. */}
              {!c.stance && <p className="mt-1 text-sm text-muted">Say whether it supports or challenges what you believe. Open “Change it” to add it.</p>}
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-teal-dark">Change it</summary>
                <div className="mt-2">
                  <WhatChangesForm path={view.path} initial={c.whatChanges ?? ""} initialStance={c.stance ?? null} confirmed />
                </div>
              </details>
            </>
          ) : (
            <>
              {c.whatChanges && <p className="mb-2 text-sm text-muted">A draft you haven&apos;t confirmed yet. Edit it until it says what you believe.</p>}
              <WhatChangesForm path={view.path} initial={c.whatChanges ?? ""} initialStance={null} confirmed={false} />
            </>
          )}
```

- [ ] **Step 9: Lint and typecheck**

Run: `cd web && pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors. (If `tsc` reports errors in files this task didn't touch, note them and keep going; they're not this task's.)

- [ ] **Step 10: Commit**

```bash
git add web/src/commands/conversations.ts web/src/commands/conversations.test.ts "web/src/app/(workbook)/conversations/actions.ts" web/src/components/workbook/form.ts web/src/components/conversations/WhatChangesForm.tsx "web/src/app/(workbook)/conversations/[slug]/page.tsx"
git commit -m "feat: confirming what a conversation changes takes a stance"
```

---

### Task 4: The step page counts the split and lists the challengers

**Files:**
- Modify: `web/src/commands/step.ts`
- Modify: `web/src/app/(workbook)/path/[id]/page.tsx`
- Test: `web/src/commands/step.test.ts`

**Interfaces:**
- Consumes: `byNewest`, `challengers`, `stanceCounts`, `chipText`, `type StanceCounts` (Task 2); `confirmWhatChanges(rel, whatChanges, stance)` (Task 3, in the test); `type PathConversation` from `web/src/core/path.ts`.
- Produces: `loadStep()`'s ready view gains `counts: StanceCounts` and `challengers: StepCard[]` (same shape as `people`, newest first).

- [ ] **Step 1: Write the failing test**

In `web/src/commands/step.test.ts`, change the conversations import to:

```ts
import { confirmWhatChanges, createConversation } from "./conversations";
```

Inside `describe("loadStep", …)`, after the test `"sets \`changed\` only when what this conversation changes is confirmed"`, add:

```ts
  it("counts the founder's stances on the step and lists the challengers newest first; nothing until someone picks one", async () => {
    const base = { type: "customer" as const, org: null, segment: "Agency owner", context: null, questionsAsked: null, observedBehavior: null, quotes: ["noted"], numbers: [], alternatives: null, urgency: null, buyingProcess: null, areas: ["problem"], followUps: [], whatChanges: null, whatChangesConfirmed: false, notes: "" };
    const ann = await createConversation({ ...base, person: "Ann", date: "2026-10-01" });
    const bea = await createConversation({ ...base, person: "Bea", date: "2026-10-10" });
    const cass = await createConversation({ ...base, person: "Cass", date: "2026-10-05" });
    await createConversation({ ...base, person: "Dee", date: "2026-10-06" });
    let v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.step.discussed).toBe(4);
    expect(v.counts).toEqual({ supports: 0, challenges: 0 });
    expect(v.challengers).toEqual([]);
    await confirmWhatChanges(ann, "Owners don't feel it", "challenges");
    await confirmWhatChanges(bea, "Owners feel it weekly", "supports");
    await confirmWhatChanges(cass, "Scheduling isn't a problem once a tool is bought", "challenges");
    v = await loadStep("problem");
    if (v.status !== "ready") throw new Error(v.status);
    expect(v.step.discussed).toBe(4);
    expect(v.counts).toEqual({ supports: 1, challenges: 2 });
    expect(v.challengers.map((p) => [p.person, p.role, p.date, p.line, p.changed])).toEqual([
      ["Cass", "Agency owner", "2026-10-05", "noted", "Scheduling isn't a problem once a tool is bought"],
      ["Ann", "Agency owner", "2026-10-01", "noted", "Owners don't feel it"],
    ]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && pnpm test src/commands/step.test.ts`
Expected: FAIL with `expected undefined to deeply equal { supports: 0, challenges: 0 }`.

- [ ] **Step 3: Load the counts and the challengers**

Replace the whole of `web/src/commands/step.ts` with:

```ts
import { discussesStep, type PathConversation, type PathStep } from "../core/path";
import { isCustomerEvidence } from "../core/conversations";
import { slugOf } from "../core/slug";
import { byNewest, challengers, stanceCounts, type StanceCounts } from "../core/stance";
import type { TestStatus } from "../store/schemas";
import { TYPE_LABELS } from "../lib/loop-labels";
import { loadLoopRecords } from "./loop";
import { loadToday } from "./today";
import { isCommitmentInstance } from "../core/commitments";

export type StepCard = { slug: string; person: string; role: string; date: string | null; line: string | null; changed: string | null };
/** An open conversation planned for this step: a commitment linked `step:<id>`, in the check-in it lives in. */
export type PlannedConversation = { week: string; id: string; text: string; due: string | null };

/** One person on the step page: who, their role, when, their first quote or line of notes, and what it changed once confirmed. */
const toCard = (c: PathConversation): StepCard => ({
  slug: slugOf(c.path),
  person: c.data.person,
  role: c.data.segment || c.data.org || TYPE_LABELS[c.data.type],
  date: c.data.date ?? null,
  line: c.data.quotes[0] ?? (c.notes.trim().split("\n")[0] || null),
  changed: c.data.whatChangesConfirmed ? (c.data.whatChanges ?? null) : null,
});

/**
 * One path step, with its place on the path, the people who discussed it (feedback conversations, newest first), how
 * their stances split, the ones that challenge the belief, the conversations planned for it and its tests. The loop
 * records are read once, so every part is the same snapshot.
 */
export async function loadStep(id: string): Promise<
  | { status: "setup" | "missing" }
  | {
      status: "ready";
      step: PathStep;
      steps: PathStep[];
      index: number;
      total: number;
      nextStep: PathStep | null;
      weekId: string;
      today: string;
      people: StepCard[];
      /** The founder's stances among `people`; a conversation with none, or `neither`, is in neither lane. */
      counts: StanceCounts;
      /** The people whose conversation the founder marked as challenging this belief, newest first. */
      challengers: StepCard[];
      planned: PlannedConversation[];
      tests: { slug: string; title: string; status: TestStatus }[];
      /** Imported customer and prospect conversations waiting for the founder; only those can become customer evidence. */
      importedCustomers: number;
    }
> {
  const records = await loadLoopRecords();
  const view = await loadToday(records);
  if (view.status !== "ready") return { status: "setup" };
  const i = view.path.steps.findIndex((s) => s.id === id);
  if (i < 0) return { status: "missing" };
  const people = records.conversations.filter((c) => discussesStep(c, id)).sort(byNewest).map(toCard);
  const counts = stanceCounts(records.conversations, id);
  const challenging = challengers(records.conversations, id).map(toCard);
  const planned = [...(view.checkin?.commitments ?? []).filter(isCommitmentInstance).map((c) => ({ ...c, week: view.weekId })), ...view.carried]
    .filter((c) => c.status === "open" && c.link === `step:${id}`)
    .map((c): PlannedConversation => ({ week: c.week, id: c.id, text: c.text, due: c.due ?? null }))
    .sort((a, b) => (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31") || a.week.localeCompare(b.week));
  const importedCustomers = records.conversations.filter((c) => c.data.seeded && isCustomerEvidence(c.data.type)).length;
  const tests = records.tests.filter((t) => t.data.area === id).map((t) => ({ slug: slugOf(t.path), title: t.data.title, status: t.data.status }));
  return { status: "ready", step: view.path.steps[i], steps: view.path.steps, index: i + 1, total: view.path.total, nextStep: view.path.steps[i + 1] ?? null, weekId: view.weekId, today: view.today, people, counts, challengers: challenging, planned, tests, importedCustomers };
}
```

(The sort moved to `byNewest`, so the people list and the challengers order the same way, and `conversationDate` is no longer imported here.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && pnpm test src/commands/step.test.ts`
Expected: PASS, all tests in the file (the earlier ordering test still passes because `byNewest` is the same comparator).

- [ ] **Step 5: The chip and the section on the page**

In `web/src/app/(workbook)/path/[id]/page.tsx`:

Change the `loadStep` import line to bring in the card type, and add the core import after the `CONVERSATION_STEP` line:

```ts
import { loadStep, type StepCard } from "@/commands/step";
```

```ts
import { chipText } from "@/core/stance";
```

Delete the local `chip` helper (the comment line `/** Only the Customer step is about conversations, … */` and the `const chip = …` statement below it).

Change the destructuring line to:

```ts
  const { step, steps, index, total, nextStep, weekId, today, people, counts, challengers, planned, tests, importedCustomers } = view;
```

Change the chip line to:

```tsx
              <span className="text-xs text-muted">{chipText(step.discussed, counts, step.tested, conversations)}</span>
```

Insert the section between the `Latest confirmed change` section's closing `)}` and the `{(conversations || people.length > 0) && (` line:

```tsx
      {/* Shown only when someone cuts against the belief. It's a list, not a warning: the heading carries the meaning. */}
      {challengers.length > 0 && (
        <section aria-labelledby="challenges-heading" className="mt-10">
          <h2 id="challenges-heading" className="font-semibold text-navy">
            What challenges this · {challengers.length}
          </h2>
          <ul className="mt-3 space-y-2">
            {challengers.map((p) => (
              <li key={p.slug}>
                <PersonCard p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
```

In the people list, replace the `<Link href={`/conversations/${p.slug}`} …>…</Link>` inside `pagedPeople.items.map((p) => (<li key={p.slug}>…</li>))` with `<PersonCard p={p} />`, so that block reads:

```tsx
            <ul className="mt-3 space-y-2">
              {pagedPeople.items.map((p) => (
                <li key={p.slug}>
                  <PersonCard p={p} />
                </li>
              ))}
            </ul>
```

Add the component at the end of the file:

```tsx
/** One person who discussed the step, as a link to their conversation. The same card lists challengers and everyone. */
function PersonCard({ p }: { p: StepCard }) {
  return (
    <Link href={`/conversations/${p.slug}`} className="block rounded-xl border border-line bg-paper p-4 hover:border-teal-dark">
      <span className="font-medium text-navy">{p.person}</span>{" "}
      <span className="text-sm text-muted">
        · {p.role} · {p.date ? formatDate(p.date) : "date unknown"}
      </span>
      {p.line && <span className="mt-1 block text-sm text-ink italic">&ldquo;{p.line}&rdquo;</span>}
      {p.changed && <span className="mt-1 block text-sm text-ink">What it changed: {p.changed}</span>}
    </Link>
  );
}
```

- [ ] **Step 6: Lint and typecheck**

Run: `cd web && pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/commands/step.ts web/src/commands/step.test.ts "web/src/app/(workbook)/path/[id]/page.tsx"
git commit -m "feat: the step page counts stances and lists what challenges the belief"
```

---

### Task 5: Decisions keep evidence against

**Files:**
- Modify: `web/src/store/schemas.ts` (`decisionSchema`)
- Modify: `web/src/core/links.ts`
- Modify: `web/src/commands/decisions.ts` (`DecisionInput`, `parseDecisionForm`, `createDecision`)
- Test: `web/src/store/loop-schemas.test.ts`, `web/src/core/links.test.ts`, `web/src/commands/decisions.test.ts`

**Interfaces:**
- Produces:
  - `decisionSchema` output gains `against: string[]` (default `[]`)
  - `LinkField` gains `"against"`; `linksOf("decision", d)` yields `evidence`, then `against`, then `relatedTest`
  - `DecisionInput.against: string[]`; `parseDecisionForm` reads every `against` form value, sets `values.against` (comma-joined) and refuses a path in both lists with `errors.against = "A record can be for or against, not both."`
  - `createDecision` refuses an `against` path that isn't in founder-data, with the same message as for `evidence`

- [ ] **Step 1: Write the failing tests**

In `web/src/store/loop-schemas.test.ts`, in `describe("decision", …)`, change the first expectation of `"applies defaults and needs a why and whether it's reversible"` to:

```ts
    expect(decisionSchema.parse(decision())).toMatchObject({ status: "decided", evidence: [], against: [], alternatives: [] });
```

and add, after that test:

```ts
  it("keeps evidence against beside evidence for", () => {
    expect(decisionSchema.parse(decision({ against: ["conversations/2026-10-01-tom.md"] })).against).toEqual(["conversations/2026-10-01-tom.md"]);
  });
```

In `web/src/core/links.test.ts`, change the decision line in `"reads each kind's link fields"` to:

```ts
    expect(linksOf("decision", { evidence: ["founder.md"], against: ["conversations/x.md"], relatedTest: null }).map((l) => [l.field, l.target])).toEqual([
      ["evidence", "founder.md"],
      ["against", "conversations/x.md"],
    ]);
```

and add to `describe("brokenLinks", …)`:

```ts
  it("a decision's evidence against must exist too", () => {
    expect(brokenLinks(linksOf("decision", { against: ["conversations/2026-10-08-dana-ortiz.md", "notes/missing.md"] }), exists)).toEqual([
      { field: "against", target: "notes/missing.md", expect: null, problem: "missing" },
    ]);
  });
```

In `web/src/commands/decisions.test.ts`, inside `describe("decision log", …)`, after `"refuses evidence that isn't in founder-data"`, add:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && pnpm test src/store/loop-schemas.test.ts src/core/links.test.ts src/commands/decisions.test.ts`
Expected: FAIL. The schema test fails on `against` (unknown key); the links test gets only `evidence`; the decisions tests get no `against` error and `r.input.against` undefined.

- [ ] **Step 3: The schema**

In `web/src/store/schemas.ts`, in `decisionSchema`, after `evidence: links,` add:

```ts
    against: links, // records that cut against the decision. A broken one is a warning, like evidence. Never also in evidence (the form refuses it)
```

- [ ] **Step 4: The links**

In `web/src/core/links.ts`, change the `LinkField` type and the decision branch:

```ts
export type LinkField = "relatedTests" | "relatedConversations" | "evidence" | "against" | "relatedTest";
```

```ts
  if (kind === "decision") return [...list("evidence", null), ...list("against", null), ...list("relatedTest", "test")];
```

- [ ] **Step 5: The command**

In `web/src/commands/decisions.ts`:

Add to `DecisionInput`, after `evidence: string[];`:

```ts
  against: string[]; // evidence that cuts against it; never overlaps evidence
```

In `parseDecisionForm`, replace the two lines

```ts
  const evidence = all(fd, "evidence").filter(Boolean);
  values.evidence = evidence.join(",");
```

with

```ts
  const evidence = all(fd, "evidence").filter(Boolean);
  const against = all(fd, "against").filter(Boolean);
  values.evidence = evidence.join(",");
  values.against = against.join(",");
```

After the line `if (values.area && !oneOf(AREAS, values.area)) errors.area = …;` add:

```ts
  if (against.some((p) => evidence.includes(p))) errors.against = "A record can be for or against, not both.";
```

In the returned `input`, after `evidence,` add `against,`.

In `createDecision`, change the `unknown` line to:

```ts
  const unknown = [...input.evidence, ...input.against, ...(input.relatedTest ? [input.relatedTest] : [])].find((p) => !present.has(p));
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd web && pnpm test src/store/loop-schemas.test.ts src/core/links.test.ts src/commands/decisions.test.ts`
Expected: PASS, all tests in the three files.

- [ ] **Step 7: Typecheck**

Run: `cd web && pnpm exec tsc --noEmit`
Expected: no errors. (`createDecision` builds `Decision` from `input`, and `against` is now on both.)

- [ ] **Step 8: Commit**

```bash
git add web/src/store/schemas.ts web/src/store/loop-schemas.test.ts web/src/core/links.ts web/src/core/links.test.ts web/src/commands/decisions.ts web/src/commands/decisions.test.ts
git commit -m "feat: a decision keeps evidence against beside evidence for"
```

---

### Task 6: The decision form and card show both lists

**Files:**
- Modify: `web/src/components/decisions/DecisionForm.tsx`
- Modify: `web/src/app/(workbook)/decisions/page.tsx` (`DecisionCard`)

**Interfaces:**
- Consumes: `radioChip` (Task 3); `values.against` and `errors.against` from `parseDecisionForm` (Task 5); `d.against: string[]` on a decision (Task 5).

- [ ] **Step 1: Two checklists on the form**

In `web/src/components/decisions/DecisionForm.tsx`:

Change the form-styles import to:

```ts
import { buttonPrimary, errorText, inputClass, radioChip } from "@/components/workbook/form";
```

Delete the local line `const chip = "flex min-h-10 …";` and replace both uses of `className={chip}` with `className={radioChip}`.

Replace the line `const chosen = new Set((v.evidence ?? "").split(",").filter(Boolean));` with:

```tsx
  const chosen = { evidence: new Set((v.evidence ?? "").split(",").filter(Boolean)), against: new Set((v.against ?? "").split(",").filter(Boolean)) };
  // The same records can be cited for or against. The command refuses one in both lists; the form keeps both choices on an error.
  const checklist = (name: "evidence" | "against", legend: string) => (
    <fieldset aria-describedby={err[name] ? `${name}-error` : undefined}>
      <legend className="mb-1 text-sm font-medium text-ink">{legend}</legend>
      <div className="space-y-1">
        {evidenceOptions.map((o) => (
          <label key={o.path} className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name={name} value={o.path} defaultChecked={chosen[name].has(o.path)} /> {o.label}
          </label>
        ))}
      </div>
      {err[name] && (
        <p id={`${name}-error`} className={errorText}>
          {err[name]}
        </p>
      )}
    </fieldset>
  );
```

Replace the `{evidenceOptions.length > 0 && (<fieldset>…</fieldset>)}` block with:

```tsx
      {evidenceOptions.length > 0 && (
        <>
          {checklist("evidence", "Evidence for (optional)")}
          {checklist("against", "Evidence against (optional)")}
        </>
      )}
```

- [ ] **Step 2: Two lists on the card**

In `web/src/app/(workbook)/decisions/page.tsx`, replace the `{d.evidence.length > 0 && (<div>…</div>)}` block inside `DecisionCard`'s `<dl>` with:

```tsx
        {d.evidence.length > 0 && <RecordList label={`Evidence for · ${d.evidence.length}`} paths={d.evidence} labels={labels} />}
        {d.against.length > 0 && <RecordList label={`Against · ${d.against.length}`} paths={d.against} labels={labels} />}
```

Add after the `RecordLink` function:

```tsx
/** One of the card's record lists. An empty one isn't rendered, so a decision without evidence against looks as it did. */
function RecordList({ label, paths, labels }: { label: string; paths: string[]; labels: Map<string, string> }) {
  return (
    <div>
      <dt className="font-medium text-ink">{label}</dt>
      <dd>
        <ul className="space-y-1">
          {paths.map((p) => (
            <li key={p}>
              <RecordLink path={p} label={labels.get(p) ?? p} />
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
```

- [ ] **Step 3: Lint and typecheck**

Run: `cd web && pnpm lint && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/decisions/DecisionForm.tsx "web/src/app/(workbook)/decisions/page.tsx"
git commit -m "feat: the decision form and card show evidence for and against"
```

---

### Task 7: Agent instructions

**Files:**
- Modify: `AGENTS.md` (the conversation and decision rows of "File kinds", "What you don't write", the "founder confirms" rule, and the `interpretation` action in "At the start of every conversation")
- Modify: `.claude/skills/synthesize/SKILL.md` (step 3's contradicts bullet, the record template and its rules)
- Modify: `.claude/skills/log-conversation/SKILL.md` (step 3)
- Modify: `.claude/skills/import-folder/SKILL.md` (the conversations bullet)

A note on one change: today `AGENTS.md` tells the agent, when the main action is `interpretation`, to write the founder's chat answer as `whatChanges` with `whatChangesConfirmed: true`. The brief says a confirmation now always carries a stance and only the form sets the stance. The consistent reading is that the agent no longer confirms: it writes the founder's answer as a draft (`whatChangesConfirmed: false`) and sends them to the conversation page to confirm it with a stance. That is what this task writes. Flag it in the PR; it's the founder's call to keep or reverse.

- [ ] **Step 1: AGENTS.md**

In the "File kinds" table, in the `conversations/YYYY-MM-DD-slug.md` row, replace `whatChanges?, whatChangesConfirmed (only the founder sets true), agentEdit?` with:

```
whatChanges?, whatChangesConfirmed (only the founder sets true), stance? (supports / challenges / neither; only the founder sets it, with whatChanges, in the app), agentEdit?
```

In the `decisions/YYYY-MM-DD-slug.md` row, replace `evidence [record paths], alternatives []` with:

```
evidence [record paths], against [record paths that cut against it; a path is never in both lists], alternatives []
```

Under `### What you don't write`, add after the first bullet:

```
- A conversation's `stance`. Draft "what this changes" as today and let the founder pick the stance in the app. The founder picking it in chat doesn't count; the form is where it's set.
```

In "Rules for founder-data", change the bullet beginning `- The founder confirms interpretations and decisions.` to:

```
- The founder confirms interpretations and decisions. Never set a test's `result`, `decision` or `closedOn`, never set `whatChangesConfirmed: true`, and never write a conversation's `stance`. Draft them in conversation and let the founder confirm in the app.
```

In "At the start of every conversation", item 3, replace the last sentence (`When \`changesWaiting\` is non-empty and \`action.kind\` is \`interpretation\`, ask what the oldest waiting conversation changes and write only the founder's answer as \`whatChanges\` with \`whatChangesConfirmed: true\`.`) with:

```
When `changesWaiting` is non-empty and `action.kind` is `interpretation`, ask what the oldest waiting conversation changes and write only the founder's answer as `whatChanges`, leaving `whatChangesConfirmed: false`; then say "Confirm it on the conversation page and say whether it supports or challenges what you believe." A confirmation always carries a stance, and only the app's form sets one.
```

- [ ] **Step 2: The synthesize skill**

In `.claude/skills/synthesize/SKILL.md`, step 3, replace the bullet beginning `- Anything that cuts against the Customer step's text` with:

```
   - Anything that cuts against the Customer step's text, or against another theme, goes in a "what contradicts" list with the same attribution. Conversations the founder marked `stance: challenges` go first, each labelled "the founder marked this as challenging"; then anything else you find. Never drop a negative case.
```

In step 9's record template, replace the `evidence:` list with:

```
   evidence:
     - conversations/2026-10-14-dana.md
     - conversations/2026-10-12-marcus.md
     - conversations/2026-10-10-clinic-owner.md
     - conversations/2026-10-02-tom.md
   against:
     - conversations/2026-10-06-priya.md
```

In "Rules for the record", add after the `alternatives` bullet:

```
   - `against` holds the paths of the conversations among the five that carry `stance: challenges`, and those paths are left out of `evidence` (a record is for or against, never both). Leave `against` out when none of the five has that stance. Anything else in "What contradicts" is your reading, not the founder's, so it stays in `evidence` and in the body only.
```

- [ ] **Step 3: The log-conversation skill**

In `.claude/skills/log-conversation/SKILL.md`, step 3, append to the end of the bullet:

```
 Never write `stance`: the founder picks whether it supports or challenges what they believe (or neither yet) when they confirm, on the same form.
```

so the step reads: `3. **What this changes.** Draft one or two sentences in \`whatChanges\` and set \`whatChangesConfirmed: false\`. Tell the founder: "Confirm or edit 'What this changes' on the conversation page." Never set it to true — only the founder's own confirmation in the app does that. Never write \`stance\`: the founder picks whether it supports or challenges what they believe (or neither yet) when they confirm, on the same form.`

The example record stays as it is (no `stance` line).

- [ ] **Step 4: The import-folder skill**

In `.claude/skills/import-folder/SKILL.md`, in the conversations bullet, replace the final `\`whatChangesConfirmed: false\`.` with:

```
`whatChangesConfirmed: false`, and no `stance` (the founder picks it when they confirm in the app).
```

The data folder's generated `CLAUDE.md` and `AGENTS.md` copy the repo's `AGENTS.md` verbatim on every start, so there is nothing to build or test here; the next start picks the edits up.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md .claude/skills/synthesize/SKILL.md .claude/skills/log-conversation/SKILL.md .claude/skills/import-folder/SKILL.md
git commit -m "docs: agents never write a stance; synthesis fills a decision's evidence against"
```

---

### Task 8: Full check and a dry run on scratch data

This needs the running app and a person at the browser. Never use the founder's real data (`~/Founderive/Intraview`). Next 16 refuses a second dev server in the same folder, so the app that's running must be stopped first, with Britt's OK, and restarted afterwards with plain `node start.mjs`.

- [ ] **Step 1: Everything green**

Run from `web/`:

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm test
```

Expected: no lint errors, no type errors, every test passes.

- [ ] **Step 2: Scratch data**

```bash
rm -rf /tmp/founderive-stance && cp -R web/test-data /tmp/founderive-stance
rm -rf /tmp/founderive-stance/program
sed -i '' '/^today:/d' /tmp/founderive-stance/founder.md
```

The fixture's `conversations/2026-10-08-dana-ortiz.md` is confirmed without a stance (an "older record"). Add a second, challenging one:

```bash
cat > /tmp/founderive-stance/conversations/2026-10-14-priya.md <<'EOF'
---
type: prospect
person: Priya
org: Northside Care
date: 2026-10-14
segment: Agencies with 10-50 caregivers
quotes:
  - We bought a scheduler last year. The problem now is payroll, not the rota.
numbers: []
followUps: []
relatedTests: []
areas:
  - problem
whatChanges: Scheduling isn't a problem for agencies that already bought a tool.
whatChangesConfirmed: false
---
Priya runs ops. The schedule takes her an hour a week now.
EOF
cd web && FOUNDER_DATA_DIR=/tmp/founderive-stance pnpm -s check-data
```

Expected: check-data reports no errors.

- [ ] **Step 3: Start against the scratch folder**

Ask Britt before stopping the running app. Then, from the repo root:

```bash
FOUNDER_DATA_DIR=/tmp/founderive-stance node start.mjs
```

Confirm the start log's "Your data:" line names `/tmp/founderive-stance`.

- [ ] **Step 4: Walk the states**

1. Open Priya's conversation. "What this changes" shows the draft note and the form with the radio row above the text. Submit with no stance: the alert reads `Say whether it supports or challenges what you believe, or neither yet.` and the draft text is still in the box.
2. Pick **Challenges it**, submit. The card reads `Challenges it · Scheduling isn't a problem for agencies that already bought a tool.`
3. Open Dana's conversation. The card shows her text and the quiet line `Say whether it supports or challenges what you believe.` Open "Change it": no stance is preselected. Pick **Supports it**, submit. The card reads `Supports it · …`.
4. Open the Problem step (`/path/problem`). The chip reads `2 people discussed this · 1 supports · 1 challenges`. A section `What challenges this · 1` sits above `People who discussed it · 2` and lists Priya with her quote and `What it changed: …`. Open the Revenue step: Dana is tagged there too, so the chip reads `1 person discussed this · 1 supports` and there is no challenges section.
5. Open Decisions. The form has `Evidence for (optional)` and `Evidence against (optional)` with the same options. Tick Priya in both, fill the rest, submit: the error `A record can be for or against, not both.` shows under "Evidence against" and both ticks are kept. Untick her from "for", submit. The card shows `Against · 1` with Priya; no `Evidence for` list.
6. Run `FOUNDER_DATA_DIR=/tmp/founderive-stance pnpm -s check-data` from `web/`: no errors, no warnings.

- [ ] **Step 5: Restore the app**

Stop the scratch instance and start the app again with plain `node start.mjs` from the repo root. Confirm "Your data:" names the founder's own folder.

- [ ] **Step 6: Record what was verified**

Add a section `## What was verified (<date>)` to `docs/product/stance-direction.md`, under the first paragraph, listing the six checks above with the result of each in one line, and anything that didn't match the brief.

```bash
git add docs/product/stance-direction.md
git commit -m "docs: stance dry run result"
```

---

## Self-review

**Spec coverage.** The field and its schema line (Task 1). Only the founder sets it: no command writes it except `confirmWhatChanges`, the skills say never (Tasks 3, 7). Confirming requires a stance (Task 3). Older confirmed records read as "not said yet", count as discussed, count in neither lane, and get the quiet line (Tasks 2, 3). `neither` shows as "Neither yet" and counts nowhere (Tasks 1, 2). Conversation page states: unconfirmed with no stance → error keeps the text (Task 3 action values); confirmed with stance → word before the text; confirmed without → quiet line; write error keeps both fields (Task 3). Step chip with zero lanes dropped, reading as today without stances; the section only with a challenger, newest first, same card fields; an unreadable conversation is already left out of `loadLoopRecords` and listed in Files to fix (Tasks 2, 4). Decisions: `against` with default `[]`, broken links warn, two checklists, two card lists with "for" first and "Against" omitted when empty, overlap refused with the field named and input kept (Tasks 5, 6). Agent instructions: both file-kind rows, "What you don't write", synthesize's contradicts order and `against`, log-conversation's line (Task 7). Code list in the brief: `schemas.ts`, `core/stance.ts`, `commands/conversations.ts`, `WhatChangesForm.tsx`, `commands/step.ts`, the step page, `commands/decisions.ts`, `DecisionForm.tsx`, `decisions/page.tsx`, `core/links.ts`: all touched. Tests list in the brief: schema values (Task 1), `confirmWhatChanges` (Task 3), `stanceCounts`/`challengers`/`chipText` (Task 2), decision form parse round-trip and refusal (Task 5), `linksOf("decision")` (Task 5), step page with and without challengers (Task 4, at the `loadStep` level, since the codebase has no rendering tests).

**Not in the brief, decided here.** The "linking to Change it" line is plain text naming "Change it" (a closed `<details>` can't be opened by a link without script). The `interpretation` action in `AGENTS.md` no longer confirms from chat, so a confirmation always has a stance; flagged in Task 7 and for the PR.

**Placeholder scan.** No TBDs; every code step shows the code; every test step shows the test and the command.

**Type consistency.** `confirmWhatChanges(rel, whatChanges, stance: string)` in Tasks 3 and 4. `StanceCounts`, `byNewest`, `challengers`, `stanceCounts`, `chipText` named the same in Tasks 2 and 4. `WhatChangesForm` takes `initialStance: Stance | null` in Task 3's component and page. `DecisionInput.against`, `values.against`, `errors.against` in Tasks 5 and 6. `LinkField` includes `"against"` and `linksOf` emits `against` with `expect: null`, matching the Task 5 tests. `radioChip` is defined in Task 3 and used in Task 6.
