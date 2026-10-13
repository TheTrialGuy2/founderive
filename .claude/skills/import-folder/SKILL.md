---
name: import-folder
description: Read a folder of the founder's documents (PDF, Word, spreadsheets, Markdown, notes) and draft Founderive records from them, marked as imported for the founder to confirm. Never changes the originals. Use when a founder says "import my folder", "bring in my documents", or pastes the prompt from Founderive's Import a folder page.
---

# Import a folder

## Before you start

- Ask which folder to read if the founder hasn't said. Read only that folder and its subfolders.
- Run `pnpm -s data-dir` from the repo's `web/` folder. It prints the absolute path of the founder's data folder; call it `<data>` and use it for every read and write below. Don't work it out any other way.
- Never edit, move, rename or delete anything in the documents folder. You only read it.

## Read

Open each document with whatever tools you have: PDF and Word text extraction, spreadsheet readers, plain reads for Markdown and text. If you can't open a file, list it in your summary as skipped, with the reason. Don't guess its contents.

## Draft, in the founder's words

Write only these kinds, under `<data>/`, with only the fields named here (every record kind is strict: an unknown field is an error that `pnpm -s check-data` reports), each with `seeded: true` and `source: "<file path relative to the folder you read>"`:

- **`<data>/founder.md`**: fill a field only if it's empty now (name, venture, oneLiner, industry, targetCustomer, problem). Don't mark `founder.md` seeded, and never change a field that has a value.
- **`<data>/canvas/<id>.md`**: one block per belief the documents state (ids from `<data>/canvas/blocks.md`, else customer, problem, solution, alternatives, advantage, channel, revenue, cost, feasibility), `status: untested`, `history: []`, `updated: <today>`. Skip a block that already has a file.
- **`<data>/conversations/YYYY-MM-DD-<slug>.md`**: one per real conversation a document records, with `type`, `person`, `date` and the notes in the body below the frontmatter. `person` is a first name or a role, never contact details. `type` is required; if it's unclear, use `other`. If the date is unknown, leave `date` out and name the file with today's date. Quotes only if verbatim in the document. `whatChangesConfirmed: false`.
- **Assumptions** (things the documents call guesses, bets or untested): don't create tests, since a test needs success and failure criteria first. List them in your summary and offer to set each one up with the new-test skill.

Never overwrite a file; add `-2` to a new file's name if it's taken. Never invent a number, date, name or quote that isn't in the documents.

## Finish

1. Run `pnpm -s check-data` from `web/` and fix anything it flags in the files you wrote.
2. Summarize: what you created (paths), what you skipped and why, which documents you couldn't read, and the assumptions you found. Tell the founder each draft shows "Imported — confirm" in the app until they confirm it.
