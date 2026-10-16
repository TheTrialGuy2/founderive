---
name: synthesize
description: Read the founder's last five confirmed customer conversations and draft three themes with counts and quotes, two product implications and one message to test, for the founder to confirm, then write one open decision record. Use when a founder says "synthesize my conversations", "what do my last five conversations add up to", or sends the line Founderive's Home button types.
---

# Synthesize the last five conversations

One loud interview isn't a strategy. This skill reads five conversations together, counts what repeats, keeps what contradicts, and lands the result where the founder can decide on it. You count and draft. The founder decides what counts as a pattern.

## Find the data folder

Run `pnpm -s data-dir` from the repo's `web/` folder, first, before reading or writing anything. It prints the absolute path of the founder's data folder. Below, `<data>` means that path: use it for every read and write, and never assume `founder-data/` or any other hard-coded folder name.

## What counts

A conversation qualifies when all three hold:

- `type` is `customer` or `prospect` (mentor, partner, investor and other are advice, not evidence)
- `seeded` is absent (an unconfirmed import doesn't count until the founder confirms it on People)
- it records something: notes in the body, `observedBehavior`, a quote or a number

`pnpm -s today --json` from `web/` prints `synthesizable`, the count the app uses; your reading should match it.

## Steps

1. **Read the conversations.** Every file in `<data>/conversations/`. Keep the ones that qualify, newest first by `date` (fall back to the date in the file name when `date` is missing). Take the first five. Read each one's frontmatter and body. Say who they were in one line, with companies counted: "Dana, Marcus, a clinic owner, Priya and Tom, 2 Oct to 14 Oct, at 3 companies." A conversation with no `org` counts as its own company. Fewer than three qualify: say so, say what would make one count (confirm it on People, or add a quote, a number or notes), and stop.
2. **Read the Customer step.** `<data>/canvas/customer.md` if it exists. Its `text` is what the founder believes now; you'll compare the conversations against it and copy it into `beliefBefore`.
3. **Draft three themes.** For each:
   - a short name in the founder's kind of words
   - "heard from N of 5 at M companies" (M is distinct `org` values; no `org` counts as its own)
   - the exact quotes, numbers or observed behavior behind it, each attributed to its person, and each labelled as what they said, what they do, or what they paid or committed. Prefer did and paid over said.
   - A theme needs at least two people. Anything heard once goes in a separate "heard once" list so the founder sees it but doesn't build on it.
   - When every person behind a theme is at one company, or the founder's notes say they all came through one introduction, say so in one sentence beside the theme: "All three are at Bright Home Care, so this is one account's view."
   - Anything that cuts against the Customer step's text, or against another theme, goes in a "what contradicts" list with the same attribution. Never drop a negative case.
4. **Confirm the themes, one turn each.** For each theme ask: keep it, rename it, or drop it? Keep the founder's wording. Don't propose a fourth unless they drop one and ask for another.
5. **Implications and the message, one turn each.** From the confirmed themes, draft two product implications and one message to test this week, in customer language taken from the quotes. The founder confirms or rewrites each.
6. **Next decision and decide-by.** Ask: "What decision do these themes put in front of you now, in one line?" Then: "When will you make it?" (a real date). The line becomes the record's title.
7. **Write one decision record** at `<data>/decisions/<today>-synthesis-<slug>.md`, where `<slug>` is a lowercase-hyphen slug of the title. Never overwrite; add `-2` if the name exists.

   ```markdown
   ---
   title: <the next decision needed, in the founder's words>
   date: <today>
   status: open
   decideBy: <the date they gave>
   area: customer
   beliefBefore: <the Customer step's current text, verbatim; leave the line out when there is none>
   evidence:
     - conversations/2026-10-14-dana.md
     - conversations/2026-10-12-marcus.md
     - conversations/2026-10-10-clinic-owner.md
     - conversations/2026-10-06-priya.md
     - conversations/2026-10-02-tom.md
   alternatives:
     - "Workflow pain (4 of 5, 3 companies): the schedule is rebuilt by hand every week"
     - "Budget owner (3 of 5, 2 companies): the owner pays, not the office manager"
     - "Switching friction (2 of 5, 1 company): the spreadsheet is shared with payroll"
   seeded: true
   source: synthesize draft <today>
   ---
   ## What we heard most often
   <each confirmed theme with its attributed quotes, numbers and behavior; the one-source note where it applies>

   ## What contradicts
   <evidence against the Customer step's text or against a theme, attributed; write "Nothing in these five." when empty>

   ## What surprised us
   <in the founder's words; ask if they haven't said>

   ## What we should change
   <the two product implications>

   ## What we should not change yet
   <in the founder's words; ask if they haven't said>

   ## Message to test this week
   "<the one message, in customer language>"

   ## Heard once
   <one line per item, attributed; write "Nothing." when empty>
   ```

   Rules for the record:
   - `area` is `customer` only when the founder uses the shipped canvas. A founder with their own `canvas/blocks.md` gets no `area` line, because the decision schema accepts only the seven shipped ids (customer, problem, solution, channel, revenue, cost, feasibility).
   - `alternatives` holds the themes because the schema has no themes field and the themes are what the founder is choosing between.
   - `status` stays `open`. Never write `decision`, `why` or `reversible`; the founder resolves it on Decisions.
   - `seeded: true` because you drafted it. The app shows it as "Imported — confirm" until the founder confirms it. Never clear it.
8. **Offer a follow-up, don't force it.** Ask once: turn the message into a test (`.claude/skills/new-test/SKILL.md`), or add a commitment to this week's check-in `{ id, text: "Test: <message>", due, status: open, link: "decisions/<the file name>" }`? Only if the founder says yes.
9. **Run `pnpm check-data`** from `web/` and fix what it flags. Close with one short summary: the three themes with counts and companies, what contradicts (or that nothing did), the message, the decide-by date, and that the record waits on Decisions.

## Never

- Tag conversations with themes or edit any conversation. Editing a confirmed conversation starts the agent-edit review on every one of the five; not worth it for a tag the app doesn't read.
- Edit the Customer step's text or any canvas block.
- Set `decision`, `why` or `reversible`, or clear `seeded`.
- Invent a quote, round a number, or merge two people's words into one.
- Score intensity or urgency. Counts and evidence kind (said, did, paid) are the only ranking.
- Show a count as a shortfall.
