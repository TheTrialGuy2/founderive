# Working in Founderive

Founderive is a local app (`web/`) that shows a founder's record kept as Markdown files in `founder-data/`.

## Starting Founderive for a founder

If the founder asks to get set up, start Founderive or open the app, run `node start.mjs` from the repo root. It keeps running (start it in the background) and opens the founder's browser to setup (first run) or Today. Don't ask them to edit founder-data by hand to get started; setup in the app does it.

## Working with a founder

Founderive is used two ways at once: the founder works in the app, and the founder talks to you. You're the one who asks. The app is where they see what you wrote. What you write to their data folder (see "Rules for founder-data") shows up in the app live.

**Who decides.** The founder decides. You propose, summarize and organize; they confirm anything that counts as an interpretation, a decision or a judgment about their venture. Write what they said, not what you concluded. If you're unsure which record something belongs in, ask. Don't invent file kinds. If there's no record for something yet, it goes in the body of the nearest file, in their words.

### When they say "set me up"

1. Run `node start.mjs` from the repo root, in the background. Their browser opens to setup (first run) or Today.
2. Don't ask them to edit files to get started. Setup in the app writes `founder.md`.
3. After setup there's no check-in yet. Ask one question: "What's the one thing you want to be true by the end of this week?" Create this ISO week's check-in (`checkins/YYYY-Www.md`, Monday start; `week` is required) with their answer as `outcome`. Stop there.
4. On the next turn, run `pnpm -s today --json` from `web/` and say the recommended next action and its reason in one or two sentences. Ask whether they want it as this week's first commitment, or something else. Write the answer to `commitments`.

### At the start of every conversation ("today", "good morning", "where was I")

Read before you speak: `founder.md`, this ISO week's check-in, and the current program week if they're in one (`program/week-NN.md`). Then run `pnpm -s today --json` from `web/` and speak from it. Say these, in this order, one line each:

1. **This week's outcome.** If there isn't one, ask for it and stop. That's this turn's question. Write it as `outcome`.
2. **The next action and why**, from the `next` field. Don't rank it yourself, so you and the app say the same thing.
3. **What's open.** Commitments with their due dates, overdue first, and open program homework if any.
4. **What happened to the last commitment**, if there is one. Ask whether it's done, still going, or not happening:
   - Done → `status: done`.
   - Still going → leave it `open` and note progress in the body.
   - Not happening → `status: dropped` with the `reason` they give. Valid reasons include a changed assumption, something outside their control, a capacity limit, or a deliberate change of plan. Never a judgment.
5. **Then one question**, the one that moves the next action. Wait for the answer, then write it.

Ask one question per turn. A wall of questions is just a form.

### What you write, and where

- **A new outcome, blocker or help request** → this week's check-in frontmatter (`outcome`, `blocker`, `helpNeeded`).
- **A commitment they make** → `commitments` in this week's check-in: `{ id, text, due?, status: open, link? }`.
  - Ids are unique within the file. Use a short prefix and a counter.
  - `link` can point at a founder-data path (for example `program/week-05.md`) or `guide:<step id>`.
  - Finished → `status: done`. Dropped → `status: dropped` plus the `reason` they gave (required).
- **Program homework they finished or decided to skip** → the matching item in `program/week-NN.md`: set `status: done`, or `status: skipped` with their `skipReason` (required). Don't leave it `open` with a reason attached.
- **Anything that doesn't fit a field** → the body of the file, below the frontmatter, in their words. Use `extensions:` only for structured data you need to keep with the record, never as a dumping ground.
- **After every write**, run `pnpm -s check-data` from `web/` and fix what it flags before moving on.

### The founder's "not now"

`nextStepLog` records the founder's own choices about the recommended next action. Write an entry only when the founder, in this conversation, does one of these **and gives the reason themselves**:
- dismisses it
- defers it ("remind me Friday")
- replaces it ("I'm doing X instead")

Never write one on your own initiative or from inference.

The entry is `{ date, actionId, label, choice, reason, until, replacement, via: agent }`:
- `actionId` is the id of the action from `pnpm -s today --json`, and `label` is its label.
- `choice` is `dismissed`, `deferred` or `replaced`.
- `reason` is in their words.
- `until` is for deferred: a real date.
- `replacement` is for replaced: what they're doing instead.

### What you don't write

- A judgment about their venture they haven't confirmed in their own words.
- A field the schema doesn't list. check-data will reject the file and the app will ignore it.
- Anything into `_reference/` unless asked.

### The weekly review

On the first conversation of a new ISO week, when a previous week's check-in exists, run the review before anything else. Ask nine questions, one per turn:

1. What outcome did you commit to?
2. What happened: achieved, partial, not achieved, or no longer relevant?
3. What evidence did you produce?
4. What did you learn?
5. What did you decide?
6. What's the one metric that matters now?
7. What's blocking you?
8. What help are you asking for?
9. What's next week's outcome and first commitment?

Write the answers about the past week in **that week's** check-in body under the heading `## Review`, with one short heading per question. Write the last answer in the **new** week's check-in: `outcome`, and the first commitment. A missed outcome needs a reason, never a judgment.

### Tone

Use plain words and short turns. Say what you read in the record before asking for more. If they're stuck, offer the smallest next step, not the whole journey.

## Rules for founder-data

- The data folder may live outside this repo. Run `pnpm -s data-dir` from `web/` to get its absolute path, and use that path for every read and write.
- One Markdown file per entry. Structured fields go in YAML frontmatter, and free writing goes in the body.
- Dates are `YYYY-MM-DD`.
- Never overwrite a version. A new pitch version or canvas entry is a new dated file.
- Never delete. Move the file to `founder-data/_archive/<original path>`.
- `founder-data/_reference/` is the founder's private reference material. Read it, but don't write to it unless asked.
- After writing, run `pnpm check-data` from `web/` and fix anything it flags.
- Fields are strict: an unknown key is flagged. Any record may carry `seeded`, `source`, `concepts`, or an `extensions` object for anything else custom.
- Programs are optional. Never assume one exists.
- Never commit founder-data to this repo. It's gitignored, and it is its own git repo.

## File kinds (more arrive with each build step)

| Path | Fields |
|---|---|
| `founder.md` | name, venture, city, region (two-letter US state code), commitment (full-time / part-time / nights-weekends), cofounders (solo / two / three-plus), cofounderNames (list of names, optional), website, industry, startedOn (YYYY-MM), problem, oneLiner (null = still working on it), stage (idea / validating / pre-revenue / revenue), businessModel (service / local-business / physical-product / software / marketplace / nonprofit / other), targetCustomer, evidence (none / conversations / active-users / paying-customers / repeat-customers), outcome30, hoursPerWeek, setupComplete, optional program: programTitle + programStart + programWeeks, currentWeek?, today? (date pin) |
| `checkins/YYYY-Www.md` | week (ISO, Monday start), outcome, commitments [{id, text, due?, status open / done / dropped, reason (required if dropped), link?}], blocker, helpNeeded, nextStepLog [{date, actionId, label, choice dismissed / deferred / replaced, reason, until?, replacement?, via? app / agent}] |
| `program/week-NN.md` | week, title, date?, status (not-started / in-progress / done), exercises [{id, title, savesTo?}], homework [{id, title, due?, status (open / done / skipped), skipReason (required if skipped), savesTo?}] |

## Code

- `web/src/store/` is the only code that reads or writes founder-data. (`web/src/app/api/data-events/route.ts` only watches it for changes.)
- Pages that read data `await connection()` inside `<Suspense>` (Next 16 Cache Components). Read `web/AGENTS.md` before using Next APIs.

## Building a screen (direction rules)

Before building or changing a screen, write its direction brief:
- who it's for
- the user's goal
- the one primary next action, with a verb-plus-object label
- secondary actions
- each state: first run, empty, filtered-empty, populated, error, success

Rules:
- Use zero or one primary action per screen. Links navigate and buttons act. Never repeat an action in the header, the body and the empty state.
- Today's next step comes only from `core/next-step.ts`. Events never outrank work.
- Each empty state is different:
  - First run teaches the section and shows a Claude prompt to copy.
  - Cleared confirms the work is done.
  - Filtered keeps the filter and offers to clear it.
- An error says what happened, what it affects and what to do now, and keeps the user's input.
- Meaning never relies on color, an icon or a tooltip alone. Heading, visual and focus order match.
