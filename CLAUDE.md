# Working in Founderive

Founderive is a local app (`web/`) that shows a founder's record kept as Markdown files in `founder-data/`.

## Rules for founder-data

- One Markdown file per entry. Structured fields go in YAML frontmatter, and free writing goes in the body.
- Dates are `YYYY-MM-DD`.
- Never overwrite a version. A new pitch version or canvas entry is a new dated file.
- Never delete. Move the file to `founder-data/_archive/<original path>`.
- `founder-data/_reference/` is the founder's private reference material. Read it, but don't write to it unless asked.
- After writing, run `pnpm check-data` from `web/` and fix anything it flags.
- Never commit founder-data to this repo. It's gitignored, and it is its own git repo.

## File kinds (more arrive with each build step)

| Path | Fields |
|---|---|
| `founder.md` | name, venture, programTitle, programStart (date), programWeeks (number), currentWeek (optional), today (optional date pin) |
| `program/week-NN.md` | week, title, date?, status (not-started / in-progress / done), exercises [{id, title, savesTo?}], homework [{id, title, due?, status (open / done / skipped), skipReason (required if skipped), savesTo?}] |

## Code

- `web/src/store/` is the only code that reads or writes founder-data. (`web/src/app/api/data-events/route.ts` only watches it for changes.)
- Pages that read data `await connection()` inside `<Suspense>` (Next 16 Cache Components). Read `web/AGENTS.md` before using Next APIs.
