# Stance direction brief

A founder reads a belief on its step and sees "4 people discussed this". Today that line can't say whether those four backed the belief or cut against it. The evidence-system audit (`evidence-system-audit.md`) rates "contradictions by default" as missing: nothing in Founderive marks a conversation as evidence against a belief, so a negative case lives only in free text nobody rereads. This brief adds the smallest form of that lane: one choice the founder makes when they already say what a conversation changes.

What it is not: a score, a per-area matrix, an inference by an agent, or a change to Home. The founder decides whether a conversation supports or challenges what they believe. The app counts and lists.

## The UI budget

One radio row on a form that already exists (the conversation's "What this changes"), one section on the step page that appears only when something challenges the belief, and one checklist on the decision form. No new page, no new file kind.

## The field

`stance` on a conversation, optional: `supports`, `challenges` or `neither`. It means, for the conversation as a whole: does what this person said or did support what I believe about the steps it's tagged with, challenge it, or neither yet.

- Only the founder sets it, through the form. Agents never write it, the same rule as `whatChangesConfirmed`. The log-conversation and import-folder skills leave it absent.
- Confirming "what this changes" requires a stance from now on. The two are always set together, so a confirmed interpretation always carries a direction.
- A confirmed conversation from before this change has no stance. It reads as "not said yet", counts in "people discussed this" as before, and in neither of the new counts. The founder adds a stance through "Change it".
- `neither` is a real answer, not a missing one. It counts in neither lane and shows as "Neither yet" on the conversation.
- Schema: `stance: z.enum(["supports", "challenges", "neither"]).nullish()`. A `whatChangesConfirmed: true` record written by the app always has one; the schema doesn't require it, so older files stay valid.

## Conversation page: What this changes

### Who it is for

A founder confirming or revising their reading of one conversation.

### User goal

Say what the conversation changes and which way it cuts, in one go.

### Primary next action

Unchanged: **Confirm what changed** while unconfirmed. The form gains a radio row above the text, with the question "Does it support what you believe?" and three options: **Supports it**, **Challenges it**, **Neither yet**.

### Secondary actions

Unchanged: "Change it" reopens the same form with the stance preselected.

### States

- **Unconfirmed, no stance chosen:** submitting shows the error "Say whether it supports or challenges what you believe, or neither yet." and keeps the text the founder typed.
- **Confirmed with a stance:** the card shows the stance as a word before the text: "Challenges it · Scheduling isn't a problem for agencies that already bought a tool."
- **Confirmed without a stance (older record):** the card shows the text as today and a quiet line "Say whether it supports or challenges what you believe" linking to "Change it".
- **Error:** the existing write error, with both fields kept.

## Step page: counts and challengers

### Who it is for

A founder deciding whether a belief holds.

### User goal

See at a glance how the people who discussed this step split, and read the ones who cut against the belief without hunting.

### Primary next action

Unchanged (write the answer, mark done, or plan a conversation on Customer).

### Secondary actions

- Open a challenging conversation.
- The chip reads "4 people discussed this · 3 support · 1 challenges". A count of zero is left out ("4 people discussed this · 2 support"). With no stances set, the chip reads as today.

### What challenges this

A section above "People who discussed it", shown only when at least one feedback conversation on this step has `stance: challenges`. Heading "What challenges this · N". Each item: the person, their role or org, the date, their first quote or first line of notes, and "What it changed: …" when confirmed. Newest first. It is a list, not a warning: no colour carries the meaning, the heading does.

### States

- **No stances on this step:** chip and page as today. No empty state for the section; it isn't there.
- **Stances set, none challenging:** chip shows the support count. No section.
- **At least one challenging:** chip shows both counts and the section lists the challengers.
- **Error:** an unreadable conversation stays in Files to fix and is counted nowhere.

## Decisions: evidence against

### Who it is for

A founder recording a call, or resolving an open question, who should cite what cuts against it as well as what supports it.

### User goal

Keep the negative case next to the decision instead of losing it.

### Primary next action

Unchanged.

### Secondary actions

The create form's evidence checklist is now two: **Evidence for** (the existing `evidence`) and **Evidence against** (`against`), same options. The card shows "Evidence for · N" and "Against · N" as two lists. A record path can't be in both lists; the form refuses with "A record can be for or against, not both."

### Schema

`against: links` beside `evidence` on a decision, default `[]`. Broken links are warnings, like `evidence`.

### States

- **Empty:** the "Against" list is omitted from the card when empty, so decisions look as they do today.
- **Populated:** both lists, "for" first.
- **Error:** form keeps the founder's input and names the field.

## Agent instructions

- AGENTS.md's conversation file kind gains `stance? (supports / challenges / neither; only the founder sets it, with whatChanges)`. The decision file kind gains `against [record paths]`.
- "What you don't write" gains: a conversation's `stance`. Draft "what this changes" as today and let the founder pick the stance in the app.
- The synthesize skill, when it writes `## What contradicts`, lists conversations with `stance: challenges` first, then anything else it finds, and fills the decision's `against` with the paths of those conversations.
- The log-conversation skill's example record doesn't include `stance`; a line in its steps says the founder picks it when they confirm.

## Code

- `web/src/store/schemas.ts`: `stance` on the conversation, `against` on the decision, `STANCES` constant.
- `web/src/core/stance.ts`: `stanceCounts(conversations, stepId)` returns `{ supports, challenges }` over feedback conversations that discuss the step; `challengers(conversations, stepId)` returns those with `stance: challenges`, newest first; `chipText(discussed, counts, tested, conversations)` builds the chip line. Pure, tested.
- `web/src/commands/conversations.ts`: `confirmWhatChanges(rel, whatChanges, stance)` requires a stance.
- `web/src/components/conversations/WhatChangesForm.tsx`: the radio row.
- `web/src/commands/step.ts` and `web/src/app/(workbook)/path/[id]/page.tsx`: counts on the step, `challengers` on the view, the section.
- `web/src/commands/decisions.ts`, `DecisionForm.tsx`, `decisions/page.tsx`: `against`.
- `web/src/core/links.ts`: `linksOf("decision")` includes `against` so check-data warns on a broken one.

## Tests

- Schema: the three values accepted, a fourth rejected; `against` defaults to `[]`.
- `confirmWhatChanges` refuses a missing or unknown stance and writes both fields.
- `stanceCounts` ignores advice, unconfirmed imports and conversations off the step; `challengers` orders newest first; `chipText` drops zero counts and reads as today with no stances.
- Decision form parse: `against` round-trips; a path in both lists is refused.
- `linksOf("decision")` includes `against`.
- Step page: no section without challengers; section with one.

## Later, if it earns its place

- A "What challenges this" line on Home when the current step gains its first challenger.
- A stance per step for a conversation tagged with several, if founders ask for it.
- Carrying a test's contradicted result up to its step chip (audit item 7).
