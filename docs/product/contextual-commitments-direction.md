# Contextual commitments direction brief

A founder reads a conversation and decides what to do about it, or makes a decision and names the next move. Today the commitment goes on Home with no trace of why: the check-in schema keeps a `link`, but the Home form can't set it and Home's due list throws it away. This brief closes that gap with the smallest loop: a commitment made on a record carries the record's path, Home says where it came from, and the record lists what was promised because of it. It is Release 1 of Codex's "Capture, context and retrieval" design (`capture-context-retrieval-design-spec.md` and `-implementation-plan.md` on branch `docs/capture-context-retrieval`); Releases 2 to 4 (global capture, relationship histories, search) stay deferred.

What it is not: a task manager, a new file kind, a new page, a change to how Home ranks, or a reverse link stored on the source record. The commitment stays in the check-in where it was made, as now.

## What was verified (2026-10-20)

Run against a scratch copy of `web/test-data` (pinned `today: 2026-10-13`, later repinned to `2026-10-20`) on a dev server on its own port, on the running app at `1d192e1`. No browser was connected, so pages were read as rendered HTML (`curl` plus `grep`/a small Python snippet) and the writes went through the app's own commands (`addLinkedCommitment`, `completeTest`, `setCommitmentStatus`); the on-submit error paths rest on the command tests.

1. The Dana Ortiz conversation page shows a "Commitments" card after Follow-ups holding only the "Make a commitment" disclosure; opening it shows the hint "It's added to this week on Home, linked to this conversation." Saving "Send Dana the pilot outline" due 2026-10-16 wrote the commitment with `link: conversations/2026-10-08-dana-ortiz.md`; the row then reads "Send Dana the pilot outline · due Fri" above the form. Whether the form's own fields clear after a save was not checked in the browser: React 19 resets an uncontrolled `<form action>` after its action succeeds, and the action returns no `values` on success, so the fields should come back empty — to be eyeballed by the founder.
2. Calling the command with empty text raised exactly "Write what you'll do." (the error the command and the form share). Whether the date field's value is kept on that error is a client-side (`useActionState`) behaviour the command alone can't show; it's covered by the existing command/parser tests.
3. The decisions page shows a "Commitments" heading and the disclosure on the fixture decision's card. Saving "Tell the two large agencies" with no date listed it with no due words (the rendered row has an empty string where due words would go).
4. Completing the fixture test (`tests/2026-10-06-paid-pilot.md`) with `nextCommitment: "Onboard the two pilots"`, due 2026-10-20, through `completeTest` made the Decision section show a "Next commitment" heading with the `LinkedCommitments` list ("Onboard the two pilots · due Oct 20"), not the plain `t.nextCommitment` line.
5. On `/today`, all three new commitments are in the check-in file and all three sources resolve (see #6), but the Due section's top-3 preview is soonest-due-first: the pre-existing overdue `c-1` and a pre-existing follow-up (both due 2026-10-12) fill two of the three slots, so only the conversation-linked commitment (due 2026-10-16) appears in the top-3 with its "From conversation with Dana Ortiz" line and its href (`/conversations/2026-10-08-dana-ortiz`). The other two (the decision- and test-linked commitments) show as text under "See all · 5", which uses `CommitmentList`, a component that carries no source data — by the brief's own scope, only `DueList`'s top-3 preview gains the source line. Home's main action is unchanged: `c-1` is still the overdue item throughout. Marking the conversation-linked commitment done (see #7) removed it from Due and added it to the conversation page's "Done or dropped" list on a re-fetch (no browser was connected to observe the live data-event push directly).
6. `pnpm -s today --json | grep -A2 '"source"'` showed all three: `{"label": "From conversation with Dana Ortiz", "href": "/conversations/2026-10-08-dana-ortiz"}`, `{"label": "From test: Ask agency owners to pay for a scheduling pilot", "href": "/tests/2026-10-06-paid-pilot"}`, `{"label": "From decision: Focus on agencies with 10-50 caregivers", "href": "/decisions#2026-10-09-focus-on-small-agencies"}`. `pnpm -s check-data` reported two pre-existing, unrelated fixture problems (`program/week-02.md`'s invalid `status`, `program/week-03.md`'s YAML syntax error) and an ignored unknown file (`notes/scratch.md`) — confirmed identical on the untouched `web/test-data` fixture, so not introduced here; no commitment-link warnings at this point. Renaming `conversations/2026-10-08-dana-ortiz.md` to `.md.bak` and running check-data again added exactly the expected warning, `checkins/2026-W42.md: commitments: "c-mvgxzwcr53e0" links to conversations/2026-10-08-dana-ortiz.md, which isn't in founder-data. Fix the link or remove it.` (plus the pre-existing one-sided `evidence`/`relatedConversations` warnings on the decision and test that already pointed at Dana). Home still listed "Send Dana the pilot outline · due Fri" with no "From …" line. Moving the file back cleared all three warnings.
7. Pinning `today: 2026-10-20` in the scratch `founder.md` (into ISO week 2026-W43) and reloading Home: the carried commitments' due words switched to "from last week", and the conversation-linked one kept its "From conversation with Dana Ortiz" line in the top-3. Marking it done via `setCommitmentStatus("2026-W42", "c-mvg…", "done")` wrote the status into `checkins/2026-W42.md` (no `2026-W43.md` was created), matching #5.

Decided during the build: nothing new. The run confirmed the brief's existing scope rather than changing it — the "From …" line belongs only to `DueList`'s top-3 preview, not the "See all" expansion, and the two pre-existing fixture errors in `program/week-02.md` and `program/week-03.md` are unrelated to this feature and were left as found.

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
