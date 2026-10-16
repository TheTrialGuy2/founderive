# Capture, context and retrieval design spec

Founderive already tells a founder what to do next and why. This design makes it as easy to capture, reconnect and retrieve the underlying work as it is to act on it.

The target experience borrows four proven mechanics without copying the products around them:

- Todoist's fast capture.
- Basecamp's connection between work and context.
- Attio's relationship history.
- Notion's retrieval across different kinds of records.

Founderive remains an opinionated founder workbook. It does not become a general task manager, CRM, document builder or team workspace.

## Outcome

A founder can capture something before they lose it, connect it to the evidence or belief it came from, find it again without remembering where it lives, and see the right follow-through on Home.

The release is successful when these four statements are true:

1. A founder can capture a commitment or start a conversation record from anywhere in the workbook in under 15 seconds.
2. A commitment made from a record keeps a visible link back to that record.
3. Repeat conversations with one person read as one relationship history, without introducing a contact database.
4. Search finds words inside records and shows why each result matched.

## Product principles

- **Capture first, structure second.** Ask only for what is necessary to save safely. Enrichment can happen on the destination record.
- **Context travels with the action.** When a founder makes a commitment from a conversation, test, decision or step, the source link is automatic.
- **One main action still wins.** Quick capture, search and record-level actions stay secondary to Home's action from `homeAction()`.
- **The founder decides.** Parsing may suggest a record type, due date or person. Nothing ambiguous is written until the founder confirms it.
- **Use existing records.** This feature adds no inbox file kind, task file kind, contact file kind or activity file kind.
- **Local first.** Search, grouping and date parsing operate on the founder's local record. No mailbox, calendar or contact data is imported.
- **No setup work.** Founderive supplies the views and links. The founder does not create databases, labels, pipelines or filters to make the system useful.

## Scope

### In this design

- A global quick-capture control and keyboard shortcut.
- A compact capture dialog for commitments and conversations.
- A record-linked commitment action on conversations, tests, decisions and path steps.
- A relationship view derived from conversations with the same person and organization.
- Full-text search across the founder's readable records.
- Home treatment for newly captured and linked work using the existing due list and main-action rules.

### Later

- Local calendar export and operating-system notifications.
- An in-app weekly review.
- A recent-activity view.
- Optional stakeholder roles such as user, buyer, approver and blocker.
- Natural-language capture of blockers, help requests and outreach counts.

### Out of scope

- Email, calendar or contact syncing.
- CRM pipelines, deal stages or contact enrichment.
- Team chat, assignments, permissions or shared inboxes.
- Projects, boards, timelines, dashboards or configurable views.
- User-created tags, fields, automations or record types.
- AI silently deciding what evidence means.
- Replacing Home's deterministic main action with user-set priorities.

## Information architecture

The top-level navigation remains:

1. Home
2. People
3. Everything logged

Two global utilities are added to the workbook shell:

- **Capture** — acts, so it is a button. It opens the capture dialog.
- **Search** — acts, so it is a button. It opens the search dialog.

On desktop they sit below the Founderive wordmark and above the Workbook group. On a small screen they sit in the existing horizontal navigation as compact buttons before the page links. They do not become new destinations in the workbook navigation.

Keyboard shortcuts:

- `C` opens Capture when focus is not in a form field or terminal.
- `/` opens Search when focus is not in a form field or terminal.
- `Escape` closes either dialog and returns focus to its trigger.

Shortcuts must never intercept input inside the Claude or Codex terminal.

## Core flow

```text
Something happens
      |
      v
Capture ---------------------------------------------------+
      |                                                     |
      +-- Commitment -> current check-in -> Home / Due       |
      |                      |                               |
      |                      +-> linked source record -------+
      |
      +-- Conversation -> conversation record -> People
                                              |
                                              +-> relationship history

Search reads all of these records and returns the source passage.
```

## Surface 1: Global Capture

### Who it is for

A founder who has just remembered a commitment or finished a useful conversation and wants to record it without navigating away from the work in front of them.

### User goal

Save the smallest trustworthy record now and add detail later.

### Primary action

**Save commitment** or **Save conversation**, depending on the selected capture type.

### Secondary actions

- Switch between Commitment and Conversation.
- Add a due date.
- Open the full conversation form instead of using quick capture.
- Cancel and return to the previous screen.

### Entry

The trigger label is **Capture**. Do not use “Quick add,” “New” or a plus icon without a label.

If Capture is opened from the global navigation, no source is assumed. If opened from a record-level action, the source is shown and linked automatically.

### Dialog layout

The dialog title is **Capture something**.

The first control is a two-option segmented control:

- **Commitment**
- **Conversation**

Default to Commitment for global capture. Default to the record-specific type when a contextual action opens the dialog.

#### Commitment fields

Required:

- **What will you do?** — one-line text input.

Optional:

- **Due** — date input.
- **Connected to** — read-only source when opened from a record; otherwise an optional picker limited to recent records and path steps.

Placeholder: `Send Dana the pilot outline`

If the founder types an unambiguous date phrase at the end of the commitment, such as “Friday” or “October 22,” Founderive may suggest that date beneath the field:

> Due Friday, October 23

The founder accepts the suggestion by selecting it. Founderive never removes words or sets a due date silently.

#### Conversation fields

Required:

- **Who did you talk to?** — first name or role only.
- **Notes** — a multiline field for rough notes, a quote or what the person did.

Optional:

- **Type** — Customer, Prospect, Mentor, Partner, Investor or Other. Default to Customer, but show the choice; do not infer evidence status from notes.
- **Organization**.
- **Date** — defaults to the founder's pinned/current date.
- **Steps it informs** — optional compact picker.

Placeholders:

- Who: `Dana, or agency owner`
- Notes: `She rebuilds the schedule every Friday and showed me the spreadsheet.`

Below the fields:

> You can add quotes, numbers, buying details and follow-ups on the conversation page.

Saving creates an ordinary confirmed conversation because the founder entered it directly. It does not set `seeded` or `source`.

### Success behavior

Do not leave the current page.

Show a status message:

- Commitment: **Commitment saved**
- Conversation: **Conversation saved**

Offer one contextual link after the status:

- **Open commitment on Home**
- **Add details to the conversation**

The link is secondary. Focus returns to the Capture trigger after the dialog closes, then the status is announced.

### States

- **First run:** The dialog defaults to Commitment and shows one sentence: “Capture something before you lose it. You can connect or expand it now or later.”
- **Empty:** The save button is disabled until required fields contain non-whitespace text.
- **Populated:** The save button names the selected record type. Optional fields remain collapsed only if hiding them does not conceal a validation error.
- **Error:** Keep every value. Say what was not saved and what to fix. Example: “The conversation wasn't saved. Add a first name or role.”
- **Success:** Close the dialog, announce the saved record, and offer the destination link.
- **Duplicate:** Do not attempt fuzzy duplicate detection in this release. Exact double submission is prevented while saving.
- **Unreadable data:** Disable saving and say: “This record can't be saved while the current week's check-in needs repair. Open the file to fix it.” Link to the existing flagged-file treatment.

### Responsive behavior

On desktop, use a centered dialog no wider than the current conversation form's readable width. On a small screen, use a full-height sheet with the primary action fixed at the bottom. The sheet must remain usable above the on-screen keyboard.

## Surface 2: Make a commitment from a record

### Who it is for

A founder reading evidence, completing a test or making a decision who knows the next action and does not want to lose why it matters.

### User goal

Turn this record into a due commitment with its context attached.

### Primary next action

The screen keeps its existing primary action. **Make a commitment** is always secondary.

### Placement

- Conversation: beside Follow-ups, after any existing change-confirmation action.
- Test: near the test's next commitment or evidence actions.
- Decision: on the individual decision card.
- Path step: in the existing secondary action group.

Selecting it opens Capture with Commitment selected and a read-only source line:

> Connected to: Conversation with Dana

The generated check-in commitment carries the source path in `link`. Path steps use `step:<id>`.

### Display after saving

Where an open linked commitment exists, the source record shows:

> Next commitment
> Send Dana the pilot outline · due Friday

The commitment can be marked Done from Home. This release does not duplicate status controls on every source record.

### States

- **First run:** No teaching panel. The secondary action label is sufficient.
- **Empty:** “No commitment connected to this record.” appears only inside a section that already lists commitments; do not add a new empty card solely to say this.
- **Populated:** Show open commitments first and completed or dropped commitments under a disclosure.
- **Error:** Keep the entered text and due date in Capture. Explain whether the source or check-in could not be read.
- **Success:** The commitment appears on Home and on the source record without a reload once the live data event arrives.

## Surface 3: People as relationship histories

### Who it is for

A founder preparing for a follow-up or trying to remember everything learned from one person or organization.

### User goal

See the relationship's conversations, evidence and promised follow-ups together.

### Primary next action

**Log another conversation**

### Secondary actions

- Open a conversation.
- Mark a due follow-up Done.
- Plan the next conversation.
- Make a commitment.
- Return to all People.

### Grouping rule

Founderive derives a relationship key from normalized `person` plus normalized `org`:

- Trim surrounding whitespace.
- Compare case-insensitively.
- Treat an absent organization as distinct from a named organization.
- Do not merge aliases, similar spellings or roles automatically.

“Dana” at no organization and “Dana” at Bright Home Care remain separate. “Dana” and “Dana Ortiz” remain separate until the founder edits the records to match. Founderive does not maintain a hidden identity map.

### People list

Each relationship appears once. The card shows:

- Person and organization.
- Latest conversation date.
- Number of conversations when greater than one.
- Latest useful line: first quote, first line of notes or observed behavior.
- Open follow-up count when greater than zero.
- Areas informed.
- Imported status if any grouped conversation still needs confirmation.

Recommended card copy:

> Dana · Bright Home Care  
> 3 conversations · last talked October 14 · 1 follow-up due  
> “I lose my whole Friday to the schedule.”  
> Customer · Problem · Alternatives

The existing filters remain:

- With feedback
- Everyone
- Imported

Filtering applies to conversations first, then groups the remaining records. An imported conversation never makes confirmed conversations disappear from the relationship; Imported shows only the conversations waiting for confirmation.

### Relationship page

URL shape: `/people/<relationship-key>`. The key is derived for navigation only and is not persisted in founder-data.

Header:

- Eyebrow: relationship type or mixed types.
- Title: person and organization.
- Metadata: “3 conversations · last talked October 14.”

Sections, in order:

1. **Next follow-up** — open follow-ups and the nearest due item.
2. **What you've learned** — latest confirmed `whatChanges`, with stance in words.
3. **Conversation history** — newest first, each with date, evidence status, useful excerpt and areas.
4. **Open commitments** — commitments linked to any conversation in the relationship.

Do not combine quotes or interpretations into a synthetic relationship summary. Synthesis remains a deliberate founder-and-agent workflow.

### States

- **First run:** The current People empty state remains and points to **Log someone you talked to**.
- **Empty filter:** Keep the selected filter and offer **Clear filter** or the existing relevant filter link.
- **One conversation:** The relationship card does not say “1 conversation.” The relationship page still uses the same structure.
- **Several conversations:** Show the count and timeline.
- **Imported:** Imported conversations are clearly marked and do not count as evidence until confirmed.
- **Error:** A flagged conversation appears as a repair row inside the relationship only if its person and organization can be read safely; otherwise it remains in the existing files-to-fix treatment.
- **Success:** After logging another conversation, return to the relationship page when capture started there.

## Surface 4: Search everything

### Who it is for

A founder who remembers a phrase, person, workaround, number or decision but not where it was recorded.

### User goal

Find the source record and matching passage quickly.

### Primary action

**Open result** — the result row itself is a link, so no repeated button is added.

### Secondary actions

- Filter by Conversations, Tests, Decisions, Canvas or Commitments.
- Clear the query.
- Close Search.

### Searchable content

Search all readable, non-archived records:

- Founder: venture, problem, one-liner and target customer.
- Check-ins: outcome, commitments, blocker, help request and review body.
- Canvas: current text, history and notes.
- Conversations: person, organization, segment, context, questions, observed behavior, quotes, numbers, alternatives, urgency, buying process, what changes and notes.
- Tests: title, belief, risk, criteria, evidence, learning, decision and body.
- Decisions: title, belief before, alternatives, decision, why and body.
- Program work: title, exercises and homework.

Do not index generated `CLAUDE.md`, `AGENTS.md`, `_reference`, `_archive`, logo files or file-system paths as content.

### Search behavior

- Case-insensitive.
- Match complete substrings in the first release.
- Split a multi-word query into terms and require all terms to occur somewhere in the record.
- Rank exact title or person matches first, then fields, then body matches. Within the same rank, newest first.
- Return at most 20 initial results. **Show more results** loads the next 20.
- Rebuild the in-memory index after the existing data-change event. Do not persist a second copy of the founder's record.

Every result shows:

- Record kind.
- Human title.
- Date when available.
- One short excerpt containing the first match.
- Matched terms emphasized with `<mark>` while preserving readable contrast.
- Imported or unreadable state where relevant.

Example:

> Conversation · Dana · October 14  
> “…rebuilds the **schedule every Friday** before payroll…”

Search must never present a generated summary as if it were source text.

### Dialog copy

- Title: **Search everything**
- Label: **Search your record**
- Placeholder: `Try a person, phrase, number or decision`

### States

- **First run:** Before typing, show three examples: “Dana,” “spreadsheet,” and “pilot price.” Do not show recent records in this release.
- **Empty query:** No result list.
- **Searching:** Show a brief text status, “Searching…,” only when results are not immediate.
- **No results:** “Nothing matches “{query}”. Try fewer words or a person's name.” Keep the query.
- **Filtered-empty:** “Nothing in {type} matches “{query}”.” Keep the filter and offer **Search every record**.
- **Populated:** Results update after a short debounce and the first result is keyboard reachable, not automatically focused.
- **Unreadable records:** Exclude their contents. If any exist, append: “{n} files couldn't be searched because they need repair.” Link to Home's files-to-fix section.
- **Error:** “Search isn't available because the record couldn't be read. Fix the flagged files and try again.”
- **Success:** Selecting a result closes Search, navigates to the record and preserves no stale query in the destination URL.

### Keyboard behavior

- Up and Down Arrow move between results after focus enters the result list.
- Enter opens the focused result.
- Escape first clears an active result selection, then closes the dialog on the next press. If no result is selected, it closes immediately.
- Focus remains trapped in the dialog while it is open.

## Surface 5: Home

### Who it is for

A founder returning to the workbook and deciding what deserves attention now.

### User goal

Act on the most important evidence-backed item without sorting an inbox manually.

### Primary next action

Unchanged: the action returned by `homeAction()`.

### Changes

- Captured commitments appear in the existing Due section.
- A commitment with a source shows a quiet context link beneath or beside its text: “From conversation with Dana,” “From Pricing test,” or “From Customer.”
- Quick Capture never creates a separate Home inbox.
- A captured conversation participates in the existing People talked to, synthesis and changes-waiting calculations as soon as it meets their existing predicates.
- Capture and Search remain global utilities, not Home cards.

### States

Home keeps its current first-run, empty, populated, error and success treatments. This design adds no competing primary card.

## Data model

### No new record kinds

The design uses current records:

- Commitment -> current `checkins/YYYY-Www.md` `commitments` entry.
- Conversation -> new `conversations/YYYY-MM-DD-<slug>.md` record.
- Relationship -> derived view over conversations.
- Search index -> derived in memory from readable records.

### Commitment links

Use the existing `link` field:

- Conversation: `conversations/<file>.md`
- Test: `tests/<file>.md`
- Decision: `decisions/<file>.md`
- Program: `program/week-NN.md`
- Path step: `step:<id>`

The source record does not receive a reverse-link field. Reverse links are derived by reading open and closed commitments across check-ins. This prevents two-sided link drift.

### Relationship identity

No schema change. Relationship grouping uses existing `person` and `org`. A later stakeholder-role design may add an optional field, but it is not required here.

### Search index

Define one normalizer that converts each valid record into:

```ts
type SearchDocument = {
  id: string;
  kind: "founder" | "checkin" | "canvas" | "conversation" | "test" | "decision" | "program";
  title: string;
  href: string;
  date: string | null;
  fields: { label: string; text: string }[];
};
```

The search implementation must use parsed schema data and record bodies, not raw frontmatter text. That keeps internal keys and private paths out of excerpts.

## Validation and privacy

- Continue to reject contact details in `person`.
- A quick conversation must pass the same schema and privacy validation as the full form.
- Do not log capture or search text to the browser console, feedback files or analytics.
- Search never reads `_reference` or `_archive`.
- A date suggestion is a suggestion until the founder selects it.
- If a save fails, the dialog retains all entered text.
- After every write, use the same validated store path as existing forms; do not add a second writer outside `web/src/store/`.

## Accessibility

- Both utilities have visible text labels and accessible names; icons may support but never replace them.
- Dialog titles are announced and initial focus moves to the first meaningful field.
- Validation errors are associated with their fields and summarized at the top when more than one exists.
- Success and error messages use an appropriate live region.
- Focus returns to the trigger on close.
- All actions are available without the keyboard shortcuts.
- Relationship and search-result meaning never relies on color, icons or badges alone.
- Touch targets remain at least the current 40-pixel control height.
- Search highlighting meets contrast requirements in both focused and unfocused results.

## Content standards

Use these terms consistently:

| Use | Avoid | Reason |
|---|---|---|
| Capture | Quick add, create new | Works across record types and starts with a verb |
| Commitment | Task, to-do | Matches the founder's promise and the current schema |
| Conversation | Interaction, activity | Matches the existing record and founder language |
| Connected to | Related object, association | Plain description of context |
| People | Contacts, CRM | Founderive records conversations, not an address book |
| Search everything | Global search | Says what the action searches |
| Add details | Enrich | Plain language |

Buttons use verb-plus-object labels. Status messages state what happened. Errors state what failed, what it affects and what to do next.

## Implementation sequence

### Release 1: Contextual commitments

Build the smallest complete context loop first:

1. Add **Make a commitment** to conversations, tests, decisions and path steps.
2. Extend the commitment form with an automatic `link`.
3. Show source context on Due items.
4. Derive linked commitments on source records.

This release proves that context improves follow-through before adding global capture.

### Release 2: Global Capture

1. Add the Capture trigger and shortcut.
2. Add compact Commitment and Conversation flows.
3. Preserve inputs through validation errors.
4. Add success destination links.

Start with explicit fields. Date suggestions can follow after the basic flow is measured.

### Release 3: Relationship histories

1. Group the People list by normalized person and organization.
2. Add the derived relationship page.
3. Return quick conversation capture to the originating relationship.
4. Add linked commitments and open follow-ups.

### Release 4: Search everything

1. Build the parsed-record search documents.
2. Add full-text substring matching and excerpts.
3. Add the Search dialog, filters and keyboard behavior.
4. Refresh the in-memory index through existing data events.

Each release should ship independently. Do not hide all four behind one long branch.

## Acceptance criteria

### Contextual commitments

- A commitment created from each supported record stores the correct `link`.
- Home shows the commitment once, with its source in words.
- Opening the source from Home lands on the correct record or step.
- Done and dropped commitments keep their source link.
- Carried commitments remain in their original check-in and still resolve correctly.
- No source record is mutated to create a reverse link.

### Global Capture

- Capture opens from every workbook page and restores focus on close.
- Keyboard shortcuts do not fire in form fields or the agent terminal.
- A valid commitment saves to the current ISO week's check-in.
- A valid conversation uses the founder's pinned/current date and passes existing privacy checks.
- An invalid save retains every entered value.
- Double submission cannot create two files or commitments.
- Capture does not replace or visually compete with Home's main action.

### Relationships

- Matching person and organization values group case-insensitively.
- Similar but unequal names never merge automatically.
- The relationship shows conversations newest first.
- Imported conversations remain visibly unconfirmed and do not count as evidence.
- Open follow-ups and linked commitments are derived correctly.
- A founder can log another conversation without retyping the person and organization.

### Search

- Search finds a phrase in every listed record field and body.
- Search excludes `_reference`, `_archive`, generated agent instructions and contact details not already allowed in records.
- Every result shows a source excerpt, not a generated summary.
- Title and person matches rank above body-only matches.
- Filters preserve the query and have a distinct filtered-empty state.
- Flagged files are counted but their unreadable contents are not searched.
- Search index refreshes after an app or agent write without restarting Founderive.

## Test plan

- Unit tests for relationship normalization and grouping.
- Unit tests for search document extraction from every schema kind.
- Unit tests for matching, ranking, excerpts and exclusion rules.
- Command tests for quick commitment and conversation creation.
- Integration tests for record-linked commitments and carried-week behavior.
- Component tests for dialog focus, validation retention, live-region messages and shortcuts.
- End-to-end flow: conversation -> linked commitment -> Home -> source record.
- End-to-end flow: quick conversation -> relationship history -> full-text search result.
- Manual narrow-screen pass with the Claude panel open to confirm Capture and Search remain usable and shortcuts do not reach the terminal.

## Measurement

Founderive does not need behavioral analytics to evaluate the first release. Use moderated tests and founder feedback with these task measures:

- Time to capture a commitment from another page.
- Time to log a rough conversation.
- Time to find a remembered phrase without knowing its record type.
- Whether a founder can explain why a due commitment exists.
- Whether repeat conversations are recognized as one relationship without explanation.
- Number of fields founders touch during quick capture.

The qualitative success question is:

> When something happens in your venture, does Founderive feel like the fastest safe place to put it—and can you find the reason for it later?

## Decisions held by this spec

- Founderive adopts capture, context, relationship history and retrieval—not generic project management.
- The existing three-destination navigation remains.
- No new persistent record kind is introduced.
- Global capture supports Commitments and Conversations first.
- Relationship grouping is derived from person and organization, with no automatic fuzzy merging.
- Search is local, derived and source-based.
- Home's main-action algorithm remains authoritative.
- Calendar integration, passive capture and notifications require separate direction briefs if founder evidence earns them.
