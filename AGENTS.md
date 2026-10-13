# Working in Founderive

Founderive is a local app (`web/`) that shows a founder's record kept as Markdown files in `founder-data/`.

## Starting Founderive for a founder

If the founder asks to get set up, start Founderive or open the app, run `node start.mjs` from the repo root. It keeps running (start it in the background) and opens the founder's browser to setup (first run) or Today. Don't ask them to edit founder-data by hand to get started; setup in the app does it.

## Rules for founder-data

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
| `checkins/YYYY-Www.md` | week (ISO, Monday start), outcome, commitments [{id, text, due?, status open / done / dropped, reason (required if dropped), link?}], blocker, helpNeeded, nextStepLog [{date, actionId, label, choice dismissed / deferred / replaced, reason, until?, replacement?}] |
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
