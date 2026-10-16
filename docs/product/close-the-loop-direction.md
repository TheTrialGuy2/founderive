# Close the loop direction brief

A founder records a decision and its reasons, and then nothing asks what came of it. The evidence-system audit (`evidence-system-audit.md`) rates "close the loop on decisions" as missing and calls it the cheapest high-value hole: without an outcome next to the decision, a founder can never learn whether they over-trust interviews or under-weight switching cost. This brief adds the smallest loop: one date the founder sets when they decide, one due item on Home when that date passes, and one short form that records what happened.

What it is not: a verdict or a score on the decision, a second revisit, a "what level does this challenge" select, or a change to tests or steps. The founder says what happened in their words. The app reminds and keeps it.

## The UI budget

One optional date field on two forms that already exist (the create form's decided branch and the resolve-an-open-question form), one due item kind on Home, and one textarea with one button on a decided decision's card once its date has passed. No new page, no new file kind.

## The fields

`revisitOn` on a decision, optional: the date the founder wants to come back and say what happened. `revisitedOn`, optional: the date they did. Both are `YYYY-MM-DD`.

- Both belong only to a decided record. An open question can't carry either, the same way it can't carry `decision`, `why` or `reversible`. The schema rejects them on `status: open`.
- `revisitedOn` requires `revisitOn`. A record can't have been revisited without having been set to be.
- The outcome text lives in the body under `## Outcome`, in the founder's words, written by the form (or by the agent when the founder tells it what happened). It renders through the card's existing body sections, so no new card UI carries it.
- Only the founder sets both dates, through the app or by telling the agent in so many words. Nothing suggests a default date. A decision without `revisitOn` never appears on Home for this reason.
- Older decisions have neither field and are untouched.
- Schema: `revisitOn: isoDate.nullish()`, `revisitedOn: isoDate.nullish()`, with the open-status and dependency rules in the existing `superRefine`.

## Decisions: setting the date

### Who it is for

A founder recording a call, or resolving an open question, who wants to be asked later whether it held.

### User goal

Name the day to come back, in one field, and forget about it until then.

### Primary next action

Unchanged: **Record the decision** on the create form, **Save decision** on the resolve form.

### Secondary actions

Unchanged. The create form's decided branch and the resolve form each gain one optional date field, label "Revisit on (optional)", with the hint "The day Home asks what happened." It sits after "Can you undo it easily?".

### States

- **Blank:** no revisit. Nothing changes anywhere.
- **A date before the decision's date:** the form refuses with "Pick a revisit date on or after the decision's date." and keeps the founder's input.
- **An open question with a date:** the create form refuses with the existing open-conflict message, "Choose 'A decision already made,' or clear this for an open question."
- **Set:** the card shows "Revisit on <date>" beside the decided badge until the date passes.
- **Error:** the existing write error, with every field kept.

## Home: the revisit due item

### Who it is for

A founder opening Home on or after the day they said they'd look back.

### User goal

Be reminded once, in the same list as everything else that's due, and get to the decision in one click.

### Primary next action

Unchanged in rule: the oldest past-due item is the main action. A revisit is an ordinary due item, so when it is the oldest past-due thing, the main action reads **What happened after: <title>?** with the reason "It's from <date>. Say what happened, in a line." No special case keeps it off the top.

### Secondary actions

Under What's due, the item "What happened after: <title>?" with its due words ("due today", "from last week", "from Oct 2"), linking to the decision's card on Decisions.

### What counts

A decided decision that is not imported (`seeded` absent), has `revisitOn` on or before today, and has no `revisitedOn`. Not before the date: the audit's words are "when it passes". `pnpm today --json` carries it in `dueItems` with `kind: revisit`, so the agent and Home agree.

### States

- **No decided decision has a revisit date:** Home as today.
- **Dates set, none reached:** Home as today.
- **One reached:** the due item, and the main action when it is the oldest past-due item.
- **Recorded:** the item is gone. "Cleared" needs no copy of its own; the list simply no longer holds it.
- **Error:** an unreadable decision stays in Files to fix and is counted nowhere.

## Decisions: What happened

### Who it is for

A founder back on the decision after its date, with something to say about what came of it.

### User goal

Write what happened next to the decision and the reasons, so the two sit together for good.

### Primary next action

**Record what happened**, on the decided decision's card, shown only once `revisitOn` has passed and there is no `revisitedOn`. One textarea, label "What happened?", placeholder "Two of the five agencies signed; the third said the price was the problem, not the tool."

### Secondary actions

None. The form has no cancel; leaving the page is the cancel.

### States

- **Before the date:** no form. The card shows "Revisit on <date>".
- **On or after the date, not recorded:** the form, with the button as the card's one primary action.
- **Submitting empty text:** "Say what happened, even if it's 'nothing yet'." and the field keeps what was typed.
- **Recorded:** `revisitedOn: <today>` is written and `## Outcome` is appended to the body with the text, below whatever is already there. Other sections (`## Why`, notes) are untouched. The card shows the Outcome section through the existing body rendering and "Revisited <date>" beside the decided badge. The form is gone.
- **Already recorded, or the decision is open:** the command refuses with "That decision has already been revisited. Reload the page." or "An open question has no outcome yet. Decide it first." The page never shows the form in those states, so these are guards against a stale tab.
- **Error:** the existing write error, with the text kept.

## Agent instructions

- AGENTS.md's decision file kind gains `revisitOn? (only when decided), revisitedOn? (only with revisitOn)`. The body may carry `## Outcome`.
- "What you write" gains: **What happened after a decision** → when the founder says what came of a decided decision, write their words under `## Outcome` in that decision's body and set `revisitedOn` to today. Never write an outcome they didn't give.
- "At the start of every conversation", step 4 (What's due): `dueItems` now holds revisits (`kind: revisit`); say each as "What happened after: <title>? from <date>" and ask the question if it's the oldest.
- "What you don't write" gains: a revisit date the founder didn't name, and an outcome they didn't say.
- The synthesize skill's open decision stays open and gets no `revisitOn`; a revisit date is set when the founder resolves it.

## Code

- `web/src/store/schemas.ts`: `revisitOn` and `revisitedOn` on the decision; open-status rejection and the dependency rule in the existing `superRefine`.
- `web/src/core/due.ts`: `DueItem.kind` gains `"revisit"`; `dueItems()` takes `revisits?: { id, title, href, revisitOn }[]`, text "What happened after: <title>?", `due` = `revisitOn`. Pure, tested.
- `web/src/commands/today.ts`: beside the open-decision rows, `revisits` from decided, unimported decisions with `revisitOn <= today` and no `revisitedOn`, with the same anchor href.
- `web/src/core/home.ts`: the overdue reason for `kind: "revisit"` is "It's <due words>. Say what happened, in a line."
- `web/src/commands/decisions.ts`: `DecisionInput.revisitOn`; `parseDecisionForm` reads it, refuses a date before `date` and refuses it on an open question; `resolveDecision` takes `revisitOn`; new `recordOutcome(path, text, today)` that guards status and `revisitedOn`, sets `revisitedOn`, and appends `## Outcome` to the body.
- `web/src/app/(workbook)/decisions/actions.ts`: `recordOutcomeAction`; `resolveDecisionAction` passes `revisitOn`.
- `web/src/components/decisions/DecisionForm.tsx` and `ResolveDecisionForm.tsx`: the date field.
- `web/src/components/decisions/OutcomeForm.tsx`: the textarea and button.
- `web/src/app/(workbook)/decisions/page.tsx`: "Revisit on <date>" / "Revisited <date>" beside the badge; the form when due.

## Tests

- Schema: both fields accepted on a decided record; either on an open record is rejected; `revisitedOn` without `revisitOn` is rejected; older records without either still parse.
- `dueItems`: a revisit appears on its date and after, not before, not once `revisitedOn` is set; it sorts with the rest by date; `kind` is `revisit` and the text is "What happened after: <title>?".
- `parseDecisionForm`: `revisitOn` round-trips; a date before the decision date is refused with the field named; a date on an open question is refused.
- `resolveDecision`: writes `revisitOn` when given.
- `recordOutcome`: refuses empty text; refuses an open decision; refuses a revisited one; writes `revisitedOn` and appends `## Outcome` after existing body text without changing it.
- `loadToday`: an imported decision with a passed date is not a revisit; a decided one is.
- Home: a passed revisit becomes the main action when it is the oldest past-due item, with the revisit reason.

## Later, if it earns its place

- A verdict on the outcome (held / didn't hold / too early), so a founder can count how often their calls hold.
- Re-arming a revisit from the outcome form.
- The audit's `challenges` select: what level a decision challenges (feature, solution, segment, problem, theory).
