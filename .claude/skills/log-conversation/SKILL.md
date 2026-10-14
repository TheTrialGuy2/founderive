---
name: log-conversation
description: Turn pasted notes or a transcript into a conversation record in the founder's conversations/ folder, with quotes, numbers, follow-ups, areas and a draft of what it changes for the founder to confirm. Use when a founder pastes call notes or says "log this conversation".
---

# Log a conversation

## Find the data folder

Run `pnpm -s data-dir` from the repo's `web/` folder, first, before reading or writing anything. It prints the absolute path of the founder's data folder. Below, `<data>` means that path: use it for every read and write, and never assume `founder-data/` or any other hard-coded folder name.

## Steps

1. **Who was it?** Ask if it isn't clear: customer, prospect, mentor, partner, investor or other. Only customer and prospect conversations count as customer evidence. Mentor, partner and investor conversations are advice, not evidence, and Founderive shows them separately.
2. **Extract, without inventing:**
   - `person`: a first name or a role only — never contact details. Don't put an email address, a phone number or a web link in `person`, even if the notes have one; leave it out of every field instead.
   - `org`, `date` (ask if you can't tell), `segment`
   - `context` and `questionsAsked`
   - `observedBehavior`: what they actually do today, not what they say they'd do
   - `quotes`: their exact words only, one per item. Paraphrase belongs in the notes.
   - `numbers`: concrete figures they gave (hours, prices, counts)
   - `alternatives`, `urgency`, `buyingProcess`
   - `followUps`: what the founder promised, each `{id: f-<random>, text, due, status: open}`
   - `areas`: the steps it informs. Any block id from the founder's `canvas/blocks.md`, or, when there's no such file, the shipped nine: customer, problem, solution, alternatives, advantage, channel, revenue, cost, feasibility
3. **What this changes.** Draft one or two sentences in `whatChanges` and set `whatChangesConfirmed: false`. Tell the founder: "Confirm or edit 'What this changes' on the conversation page." Never set it to true — only the founder's own confirmation in the app does that.
4. **Tests.** List the founder's planned and running tests (a test that's `complete` or `abandoned` is closed and frozen, so leave it off the list) and ask which, if any, this conversation is evidence for. For each one they confirm, add the test path to `relatedTests` and add this conversation's path to that test's `relatedConversations` — both sides, or `check-data` will warn about a one-sided link. If this is a mentor, partner or investor conversation, say it's being linked as advice, not evidence.
5. **Write** `<data>/conversations/<YYYY-MM-DD>-<person-slug>.md` (the conversation's date). If the name exists, add `-2`. Never overwrite. Mark it `seeded: true` with `source: log-conversation draft <today>` — you're drafting this from pasted notes, not the founder's own form, so it shows as "Imported — confirm" until the founder confirms it there. The body is the notes, tidied but in the founder's words.
6. Run `pnpm check-data` from `web/` and fix anything flagged. Show a short summary: who, the strongest quote, follow-ups with dates, linked tests.

## Example

```markdown
---
type: customer
person: Dana
org: Bright Home Care
date: 2026-10-08
segment: Agencies with 10-50 caregivers
observedBehavior: Rebuilds the schedule in a spreadsheet every Friday
quotes:
  - I lose my whole Friday afternoon to the schedule.
numbers:
  - 4 hours a week on scheduling
alternatives: Spreadsheet plus group texts
followUps:
  - id: f-k3x9
    text: Send Dana the pilot one-pager
    due: 2026-10-12
    status: open
relatedTests: []
areas:
  - problem
whatChanges: Scheduling pain is weekly and felt by the owner
whatChangesConfirmed: false
seeded: true
source: log-conversation draft 2026-10-08
---
Call notes in the founder's words.
```
