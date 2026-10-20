# Contextual commitments direction brief

A founder reads a conversation and decides what to do about it, or makes a decision and names the next move. Today the commitment goes on Home with no trace of why: the check-in schema keeps a `link`, but the Home form can't set it and Home's due list throws it away. This brief closes that gap with the smallest loop: a commitment made on a record carries the record's path, Home says where it came from, and the record lists what was promised because of it. It is Release 1 of Codex's "Capture, context and retrieval" design (`capture-context-retrieval-design-spec.md` and `-implementation-plan.md` on branch `docs/capture-context-retrieval`); Releases 2 to 4 (global capture, relationship histories, search) stay deferred.

What it is not: a task manager, a new file kind, a new page, a change to how Home ranks, or a reverse link stored on the source record. The commitment stays in the check-in where it was made, as now.

## What already exists (and what this brief leaves alone)

Two of the four sources Codex listed already write a link, each with its own meaning on Home:

- **Tests.** Completing a test writes its next commitment to this week with `link: tests/<slug>.md` (`ensureNextCommitment`). Home ranks it at tier 7, "You chose this as the next step after a test." Nothing here changes that; the test page gains the list only, no second form. A test has one commitment moment, and it is completion.
- **Steps.** A step page already has two commitment forms: `step:<id>` is a planned conversation (counted in path progress, listed in Planned, drives the Customer step's main action) and `guide:<id>` is "commit to this step" (tier 7, and it stops Home proposing another guide step). A third kind would need a third link form and a third ranking rule. **Steps are not a source in this release.** Decided 2026-10-20; revisit once the two new sources have been used.

So what is new: conversations and decisions as sources, the "From …" line on Home, and a commitments list on the three record kinds.

## The UI budget

One disclosure form ("Make a commitment") on a conversation page and on a decided or open decision card. One read-only list ("Commitments") on the conversation page, the decision card and the test page, shown only when there is something to list. One quiet line under a linked commitment in Home's due list. No new page, no new file kind, no new primary action anywhere.

## The link

`link` on a check-in commitment already accepts any string. This brief gives three values a meaning: a founder-data path under `conversations/`, `decisions/` or `tests/`, exactly as the record is named on disk (`conversations/2026-10-14-dana.md`). Nothing else is a contextual source: `guide:` and `step:` keep their existing meanings, and `program/…` links keep working as they do today without the source treatment.

- The path is saved unchanged. No reverse field is written on the source record.
- A link to a file that isn't there is a check-data **warning** on the check-in ("commitments: "c3" links to conversations/… which isn't in founder-data"), never an error, the same as a one-sided test link. Home keeps the commitment and drops the line. (Today check-data says nothing about a path link, so this is a small addition.)
- A link whose source can't be read (the source file is flagged) is the same: the commitment shows, the line doesn't.
- The resolver (`core/commitment-source.ts`) is pure: it recognises the three folders, rejects anything else (traversal, absolute paths, other folders, `guide:`, `step:`), and formats the label. Labels in words: "From conversation with Dana" (person, as the People card shows it), "From decision: Only agencies still on spreadsheets" (title), "From test: Paid pilot" (title).

## Home: where it came from

### Who it is for

A founder reading Due who sees "Send Dana the pilot outline" and wants to remember which Dana, and why.

### User goal

Open the record the commitment came from, in one step, without leaving the commitment's Done button.

### Primary next action

Unchanged. Home's main action comes only from `homeAction()`; nothing here changes `nextStep()`. A conversation- or decision-linked commitment is an ordinary commitment (tier 6, or 4 when overdue). A test-linked one keeps tier 7. Tests lock this down.

### Secondary actions

Under a linked commitment's text in Due, one quiet link: "From conversation with Dana", to the record. For a decision, the link lands on the decision's page and card anchor, computed the way `loadToday()` already computes it for due decisions (shared helper, not a second copy). This is a `DueList` change plus the `DueItem` shape; the step page's Planned list carries `step:` links only and is untouched.

### Data

`DueItem` gains `source?: { label: string; href: string }`. `href` keeps its meaning (where the item itself lives: a follow-up's conversation, a decision's card). `dueItems()` takes an optional `sources: Map<link, source>`; `loadToday()` resolves the distinct links of the ranked commitments in one batch and passes it. `pnpm -s today --json` shows `source` on the due item, so the agent can say it.

### States

- **No link, or an unrecognised one:** as today.
- **Linked, source readable:** the line.
- **Linked, source missing or flagged:** no line, commitment unchanged. check-data carries the warning.
- **Carried from an earlier week:** the line still shows; Done and Drop still write to the original week.

## Conversation and decision: make a commitment here

### Who it is for

A founder on a conversation page who has just written what it changes, or on a decision card who has just decided, and knows the next thing to do.

### User goal

Write the commitment where the reason is, and see it on Home with the reason attached.

### Primary next action

Unchanged on both pages (the conversation's "Confirm what changed" / "Change it", the decision page's "Record the decision"). **Make a commitment** is a disclosure, quiet style, never `buttonPrimary`.

### Secondary actions

The form, collapsed under the summary **Make a commitment**:

- Label **What will you do?**, placeholder `Send Dana the pilot outline`.
- Label **Due (optional)**, a date input.
- Hint under the text field: `It's added to this week on Home, linked to this conversation.` (or `… to this decision.`). The form sits on the record, so there is no "Connected to" line; the location says it.
- Button **Save commitment**; pending **Saving…**; success status **Commitment saved** with the fields cleared and the disclosure left open.

Where it sits: on the conversation page, in a card titled **Commitments** after Follow-ups, below the list; on the decision card, after the body sections and before the resolve or outcome form. Only on records the founder has confirmed: an imported (`seeded`) conversation or decision shows the list but not the form, the same rule as the outcome form and the complete-test form.

### The list

`LinkedCommitments`: open ones first, text plus due words ("due Fri", "from last week"), then **Done or dropped · N** under a disclosure, a dropped one with its reason. Status is changed on Home only; the list is read-only. Rendered only when there is at least one commitment, so a record with none shows no empty card and no "No commitments yet" line; on the conversation page the Commitments card then holds the form alone.

Reads: every valid check-in, every commitment whose `link` equals the record's path, excluding repeating definitions and including their instances. Done this once per page, not per card: `loadDecisions()` reads the check-ins once and groups by link.

### States

- **First run:** no teaching panel. The summary label is the teaching.
- **Empty text:** `Write what you'll do.` and the due date is kept.
- **Bad date:** `Use a real date.` and the text is kept.
- **Stale week:** the existing `assertThisWeek()` message; the fields are kept.
- **Source gone or unreadable** (a stale tab): `The commitment wasn't saved because this record is no longer there. Reload the page.` / `… because this record needs repair. Fix the flagged file and try again.`
- **Success:** the status line, the list gains the row, Home gains it with its line, through the existing data event.
- **Imported record:** list only, no form.

## Test: what was promised after it

The test page already prints `Next commitment: <text> · due <date>` from the test's own fields, which can't say whether it happened. When a commitment linked to the test exists in any check-in, the page shows the `LinkedCommitments` list in its place, with status; when none does (a test completed with "stop", or one whose commitment write failed), the plain line stays. No form on the test page.

## Agent instructions

- AGENTS.md, "A commitment they make": `link` may also be the path of the conversation, decision or test the commitment comes from. When the founder makes a commitment while talking about one of those records, set it. Never on a repeating definition.
- "At the start of every conversation", step 4: when a due item has `source`, say it after the due words ("Send Dana the pilot outline, due Fri, from your conversation with Dana").
- File kinds table, `checkins`: `link?` gains "or the path of the conversation, decision or test it comes from".
- Rules for founder-data: a commitment link to a missing record is a check-data warning; fix or remove it.

## Code

- `web/src/core/commitment-source.ts` (new, pure): `parseSourceLink(link) → { kind, path } | null`, `sourceLabel(kind, name)`. Tests.
- `web/src/core/due.ts`: `DueItem.source?`; `dueItems()` takes `sources?: Map<string, { label; href }>` and attaches by `link`. The commitment input gains `link?`.
- `web/src/commands/commitment-sources.ts` (new): `resolveCommitmentSources(links)` (reads through `store/read.ts`, dedupes, omits missing or flagged, builds hrefs; the decision href helper moves out of `today.ts` so both use it) and `loadLinkedCommitments()` (one pass over every valid check-in, grouped by link).
- `web/src/commands/commitments.ts` (new): `addLinkedCommitment(weekId, { text, due, link })`: link shape, source exists and parses, text, date; then `addCommitment()`.
- `web/src/app/(workbook)/actions.ts`: `saveLinkedCommitment` server action with `assertThisWeek()`, values kept on error. `saveNewCommitment` is untouched.
- `web/src/components/commitments/LinkedCommitmentForm.tsx` and `LinkedCommitments.tsx` (new, client where they act).
- `web/src/commands/conversations.ts` (`loadConversation` gains `commitments`), `decisions.ts` (`DecisionRow.commitments`), `venture-tests.ts` (`loadTest` gains `commitments`), `today.ts` (sources into `dueItems`).
- Pages: `conversations/[slug]/page.tsx` (Commitments card), `decisions/page.tsx` (list and form on the card; `weekId` from the page's one `today`), `tests/[slug]/page.tsx` (list in place of the plain line).
- `web/src/components/home/DueList.tsx`: the source line.
- `web/src/store/check.ts`: the missing-source warning for path links.
- `web/scripts/today.mts`: nothing; `source` rides along in the JSON.

## Tests

- `commitment-source`: each folder recognised; `guide:`, `step:`, `program/`, traversal, absolute paths and unknown folders rejected; labels.
- `dueItems`: source attached by link and carried separately from `href`; order unchanged; unlinked items unchanged.
- `nextStep`: conversation- and decision-linked commitments rank as ordinary (6, and 4 overdue); test-linked stays 7; guide stays 7.
- `addLinkedCommitment`: saves with the link unchanged; refuses a bad link shape, a missing source, a flagged source, empty text, a bad date; never touches the source file.
- `resolveCommitmentSources` / `loadLinkedCommitments`: labels and hrefs for all three kinds; a decision on page 2 gets `?page=2#slug`; grouping across weeks; done and dropped included; repeating definitions excluded, instances included; a missing source is omitted without hiding the commitment.
- `loadToday`: a linked commitment's due item carries `source`; a broken link carries none.
- `check-data`: a path link to a missing file warns; a step link still checks its id; a good link is silent.

## Dry run (Task last, on scratch data)

Scratch copy of `web/test-data` under `FOUNDER_DATA_DIR`, pinned date. One commitment from Dana's conversation, one from a decision on page 2, one test completed with a next commitment. Check: Home shows each once with its line; each line lands on its record; the records list them; Done on Home updates the list; advance the pinned date a week and the carried one keeps its line; `pnpm -s check-data` clean, then rename the conversation file and see the warning; `pnpm -s today --json` shows `source`.

## Later, if it earns its place

- A step as a source, once there is a reason to choose among `step:`, `guide:` and a third form.
- Done and Drop on the record's list, not only on Home.
- Global capture (Release 2), which reuses `addLinkedCommitment` with no source.
