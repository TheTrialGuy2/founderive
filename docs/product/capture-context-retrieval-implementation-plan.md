# Capture, context and retrieval implementation plan

This plan implements [capture-context-retrieval-design-spec.md](capture-context-retrieval-design-spec.md) as four independently shippable releases. The next release is **Contextual commitments**.

## Why contextual commitments come first

The schema and command layer already support `commitment.link`, but the ordinary commitment form cannot set it and Home discards it when building Due items. Closing that gap gives Founderive a complete loop with little new product surface:

> Evidence or belief → commitment → Home → source context

It also creates the link infrastructure that Global Capture, relationship histories and Search will use later.

## Release order

1. **Contextual commitments** — keep the reason behind an action.
2. **Global Capture** — save a commitment or rough conversation from anywhere.
3. **Relationship histories** — group repeat conversations without creating contacts.
4. **Search everything** — retrieve source passages across the local record.

Do not begin Releases 2–4 in the first branch. Ship and observe each release before expanding the surface.

---

# Release 1: Contextual commitments

## Direction brief

### Who it is for

A founder reading a conversation, test, decision or path step who knows what they need to do next.

### User goal

Make a commitment without losing the evidence, decision or belief that caused it.

### Primary next action

Each screen keeps its existing primary action. **Make a commitment** is secondary.

### Secondary actions

- Add commitment text and an optional due date.
- Open a commitment's source from Home.
- Mark it Done or drop it with a reason using the existing controls.

### States

- **First run:** No teaching card. The action label and “Connected to” line explain the feature.
- **Empty:** The form opens with the source already named and requires commitment text.
- **Populated:** The source page lists open linked commitments first; completed and dropped work stays under a disclosure.
- **Error:** Keep text and due date. Say whether the source disappeared, the check-in needs repair or the page is from an earlier week.
- **Success:** Close the inline form, show “Commitment saved,” and let the data event refresh Home and the source.
- **Stale page:** Reuse `assertThisWeek()`; do not write into the old week.

## Technical shape

### 1. Add a commitment-source model

Create `web/src/core/commitment-source.ts` with pure types and formatting rules:

```ts
type CommitmentSource = {
  link: string;
  label: string;
  href: string;
  kind: "conversation" | "test" | "decision" | "step";
};
```

Responsibilities:

- Recognize only `conversations/*.md`, `tests/*.md`, `decisions/*.md` and `step:<id>` for this release.
- Return null for unknown, malformed or unsupported links.
- Format the visible prefix:
  - `From conversation with Dana`
  - `From Paid pilot test`
  - `From Pricing decision`
  - `From Customer`
- Keep link parsing separate from file reads so it can be unit tested.

Do not broaden the schema's accepted `link` values. Existing guide and program links continue to work as they do now; they simply do not receive the new source treatment until a later brief covers them.

### 2. Resolve source labels and destinations

Create `web/src/commands/commitment-sources.ts`.

It should expose two read functions:

```ts
resolveCommitmentSources(links: string[]): Promise<Map<string, CommitmentSource>>
loadLinkedCommitments(link: string): Promise<LinkedCommitment[]>
```

`resolveCommitmentSources`:

- Deduplicates links before reading.
- Reads records through `web/src/store/read.ts` only.
- Uses conversation person, test title, decision title and canvas definition title for labels.
- Builds conversation and test URLs from their slug.
- Builds decision URLs with the correct page and anchor. Decisions are paginated newest first, so the resolver must calculate the page just as `loadToday()` does for due decisions.
- Builds path-step URLs as `/path/<id>` after confirming the id exists in the active canvas definitions.
- Omits a source that is missing, unreadable or malformed. The commitment remains usable and `check-data` continues to report a broken link.

`loadLinkedCommitments`:

- Reads every valid check-in because completed work remains in its original week.
- Excludes repeating definitions, but includes their materialized instances.
- Returns week, id, text, due, status and reason.
- Sorts open first, then due date, then newest week; done and dropped follow newest first.
- Does not mutate the source record or add a reverse-link field.

Avoid calling `loadLinkedCommitments` once per decision card. `loadDecisions()` should read linked commitments once, group them by link and attach the matching list to each row.

### 3. Add a guarded write command

Add `addLinkedCommitment()` to `web/src/commands/checkin.ts` or a small `web/src/commands/commitments.ts` module.

Inputs:

```ts
{
  weekId: string;
  text: string;
  due: string | null;
  link: string;
}
```

Before `addCommitment()`:

1. Require a recognized link shape.
2. Confirm the linked record or step exists and is readable.
3. Reuse the existing required-text and ISO-date validation.
4. Keep `assertThisWeek()` in the server action, not the core command.
5. Save the link unchanged in the current check-in.

If the source disappeared, return:

> The commitment wasn't saved because its source is no longer there. Reload the page.

If the source cannot be read:

> The commitment wasn't saved because its source needs repair. Fix the flagged file and try again.

The write remains atomic at the check-in level through the existing `updateEntry()` path.

### 4. Add the server action

In `web/src/app/(workbook)/actions.ts`, add `saveLinkedCommitment`.

It should:

- Read `week`, `text`, `due` and `link` from `FormData`.
- Retain `text` and `due` in `ActionState.values` after an error.
- Call `assertThisWeek(week)`.
- Call the guarded linked-commitment command.
- Use the existing `run()` error shape.

Do not modify `saveNewCommitment` for the first release. Keeping the contextual action separate avoids trusting an optional hidden link on the ordinary Home form and limits regression risk.

### 5. Build one reusable inline form

Create `web/src/components/commitments/LinkedCommitmentForm.tsx`.

Props:

```ts
{
  weekId: string;
  link: string;
  sourceLabel: string;
}
```

UI:

- Disclosure summary: **Make a commitment**.
- Read-only line: `Connected to: <sourceLabel>`.
- Label: **What will you do?**
- Placeholder: `Send Dana the pilot outline`
- Label: **Due**
- Submit: **Save commitment**
- Pending: **Saving…**
- Success status: **Commitment saved**

Use the existing `Field`, `FormAlert`, `inputClass`, `buttonQuiet` and `ActionState` patterns. The form is secondary on every page, so it never uses `buttonPrimary`.

After success:

- Reset text and due.
- Collapse the disclosure if the component can do so without fragile DOM manipulation; otherwise leave it open with empty fields and the success message.
- Let `refresh()` and the existing live data event update the record and Home.

### 6. Show linked commitments on source records

Create `web/src/components/commitments/LinkedCommitments.tsx`.

Behavior:

- Render nothing when there are no linked commitments. Do not add an empty card.
- Open commitments show text and due words.
- Done and dropped commitments sit under `Done or dropped · N`.
- A dropped item includes its reason.
- Status changes remain on Home in Release 1; source pages are read-only lists.

Placement and loader changes:

#### Conversation

- Extend `loadConversation()` with linked commitments for `view.path`.
- Render `LinkedCommitments` near Follow-ups.
- Render `LinkedCommitmentForm` after the existing interpretation action, using `isoWeekId(today)`.
- Source label: `Conversation with <person>`.

Files:

- `web/src/commands/conversations.ts`
- `web/src/app/(workbook)/conversations/[slug]/page.tsx`

#### Test

- Extend `loadTest()` with linked commitments for `view.path`.
- Render the list after the test's Decision or current status section.
- Render the form for open and closed tests. A closed test is frozen as evidence, but making a commitment does not mutate the test.
- Source label: test title.

Files:

- `web/src/commands/venture-tests.ts`
- `web/src/app/(workbook)/tests/[slug]/page.tsx`

#### Decision

- Extend `DecisionRow` with its linked commitments.
- Render the list and form inside each `DecisionCard`.
- Pass one current `weekId` into the decision list rather than loading the founder date per card.
- Source label: decision title.

Files:

- `web/src/commands/decisions.ts`
- `web/src/app/(workbook)/decisions/page.tsx`

#### Path step

- Extend `loadStep()` with commitments whose link exactly matches `step:<id>`.
- Render the list and form above the Tests disclosure so it remains secondary to the step answer and completion actions.
- Source label: step title.

Files:

- `web/src/commands/step.ts`
- `web/src/app/(workbook)/path/[id]/page.tsx`

### 7. Carry source context into Home

Extend the input and output of `dueItems()`:

```ts
type DueItem = {
  // existing fields
  source?: { label: string; href: string };
};
```

In `loadToday()`:

1. Collect non-null links from ranked commitments.
2. Resolve them in one batch.
3. Pass the matching source into `buildDueItems()`.

Do not overload the current `href` field. It currently means that the due item itself lives at the destination, as with a follow-up or decision. A commitment's `source` is supporting context, not the commitment's destination.

In `DueList` and `CommitmentList`:

- Keep commitment text as plain text.
- Add a quiet source link beneath it: `From conversation with Dana`.
- Follow-ups and decisions keep their existing linked titles.
- A missing source leaves the commitment visible without a link.
- Do not repeat the source if the text already sits on the source page.

Files:

- `web/src/core/due.ts`
- `web/src/commands/today.ts`
- `web/src/components/home/DueList.tsx`
- `web/src/components/today/CommitmentList.tsx`

### 8. Preserve main-action behavior

No ranking changes are intended.

Important regression guard: `next-step.ts` currently treats test-linked commitments specially at tier 7. A conversation- or decision-linked commitment should remain an ordinary commitment at tier 6 unless overdue. A step-linked contextual commitment should also remain ordinary; only the existing planned-conversation `step:` behavior in path progress should change the path.

Add tests that lock this down before shipping.

## Test plan

### Pure unit tests

`web/src/core/commitment-source.test.ts`

- Recognizes each supported link.
- Rejects traversal, absolute paths, unsupported folders and malformed step ids.
- Formats source labels in words.
- Does not interpret `guide:` as a contextual source.

`web/src/core/due.test.ts`

- Carries resolved source separately from `href`.
- Keeps sorting unchanged.
- Leaves unlinked commitments unchanged.

`web/src/core/next-step.test.ts`

- Conversation- and decision-linked commitments stay at ordinary commitment tier.
- Test-linked behavior remains unchanged.
- Overdue ranking remains unchanged for every source kind.

### Command tests

`web/src/commands/checkin.test.ts`

- Saves a valid linked commitment.
- Refuses a missing, unreadable or malformed source.
- Preserves the link when marking Done or dropped.
- Does not mutate the source file.

`web/src/commands/commitment-sources.test.ts`

- Resolves labels and URLs for all supported sources.
- Calculates a paginated decision anchor correctly.
- Groups linked commitments across weeks.
- Includes done and dropped work.
- Excludes repeating definitions and includes materialized instances.
- Omits unreadable sources without hiding commitments.

Extend existing conversation, test, decision, step and today command tests to assert their linked commitment views.

### Action and integration tests

- Stale-week submission is rejected.
- Validation errors retain text and due date.
- Two simultaneous submissions create two intentional commitments, while one double-click is blocked by the pending button.
- Conversation -> commitment -> Home -> conversation source works.
- Decision on page 2 -> commitment -> Home -> correct decision anchor works.
- Carried commitment still opens its source and writes Done/drop to its original week.

### Manual pass

1. Create one linked commitment from each source kind.
2. Confirm each appears once on Home with the right `From …` line.
3. Follow each source link.
4. Mark one Done and drop one with a reason.
5. Advance the pinned date into a new ISO week and confirm an open commitment carries with its source intact.
6. Open the Claude panel and narrow the page; confirm the inline form remains usable.
7. Run `pnpm -s check-data` against the test record.

## Suggested branch and commit sequence

One branch: `feat/contextual-commitments`

1. `test: define commitment source behavior`
2. `feat: resolve and validate commitment sources`
3. `feat: save linked commitments`
4. `feat: show linked commitments on source records`
5. `feat: show commitment context on Home`
6. `test: cover contextual commitment flows`
7. `docs: update Founderive feature guide`

Do not commit until the code-review quality gate passes.

## Verification commands

Run from `web/`:

```bash
pnpm test
pnpm -s check-data
pnpm build
```

If the full suite is slow during development, run the affected test files first, then the full suite before review.

## Release 1 done means

- A founder can make a linked commitment from a conversation, test, decision or path step.
- Home names the source without changing action ranking.
- The source record shows its commitments without storing reverse links.
- Carried, done and dropped commitments retain context.
- Missing or unreadable sources fail safely or degrade without hiding the commitment.
- Tests, type checking, build and `check-data` pass.
- No new record kind, top-level page or primary action was added.

---

# Releases 2–4: implementation outline

These outlines are sequencing context, not authorization to build them with Release 1.

## Release 2: Global Capture

Main work:

- Add Capture to `WorkbookNav` and a dialog host to `WorkbookShell`.
- Guard the `C` shortcut from inputs, textareas, selects, contenteditable elements and the terminal.
- Reuse the linked-commitment command for Commitment capture.
- Add a compact parser and command for the minimum conversation fields.
- Reuse existing conversation privacy and schema validation.
- Return a destination link in the action state after saving.

Main risk: duplicating conversation validation. Extract shared validation rather than maintaining a second rule set.

## Release 3: Relationship histories

Main work:

- Add pure person-and-organization normalization and grouping.
- Change `loadPeople()` from conversation cards to relationship cards.
- Add a derived relationship route that resolves the key without persisting it.
- Aggregate conversations, open follow-ups and linked commitments.
- Prefill person and organization when logging another conversation.

Main risk: unstable derived URLs after a founder edits a name. Relationship links are navigation conveniences, never stored in records; an old URL may return to People with a clear explanation.

## Release 4: Search everything

Main work:

- Normalize parsed records into `SearchDocument` values.
- Build local substring matching, ranking and excerpts.
- Add Search to `WorkbookNav` and a dialog host to `WorkbookShell`.
- Guard the `/` shortcut from forms and the terminal.
- Refresh the in-memory documents after data events.
- Add record-kind filters and the required empty/error states.

Main risk: leaking internal or private content into excerpts. Build documents from explicit schema fields and bodies; never index raw frontmatter, `_reference`, `_archive` or generated agent instructions.

## Immediate next action

Before implementation, review and approve these three Release 1 decisions:

1. Contextual commitments are read-only on source records; Done and Drop remain on Home.
2. Conversation-, decision- and step-linked commitments keep ordinary commitment priority; only test commitments retain their current special tier.
3. Decision source links calculate the correct paginated anchor rather than landing at the top of Decisions.

Once those are accepted, start with the pure commitment-source tests and the batched resolver. They define the boundaries every later UI change depends on.
