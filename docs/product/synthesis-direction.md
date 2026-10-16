# Synthesis direction brief

Customer discovery is only worth the notes it leaves behind if the notes change what the founder does next. Founderive already captures one conversation well (quotes, numbers, behavior, alternatives, follow-ups, what it changes). It has nothing that reads five conversations together. This brief adds that: a quiet button on Home that hands the job to the Claude panel, a skill that drafts themes for the founder to confirm, and one decision record where the result lands.

What it is not: a main action, a new file kind, a score, or a tag on every conversation. The founder decides what counts as a pattern; the agent counts and drafts.

## The UI budget

This feature adds one quiet button to Home and nothing else. No new page, no new form, no new field on any record. The work happens in the Claude panel, in the founder's words, one question per turn. The result lands on the Decisions page the founder already uses, shaped like every other decision. If a later version wants a Patterns view, that is a separate brief with its own budget.

## Home: synthesize

### Who it is for

A founder with a handful of confirmed customer conversations who hasn't yet asked what they add up to.

### User goal

Turn the last five customer conversations into three themes, two product implications and one message to test this week, without doing it alone and without treating one loud interview as a strategy.

### Primary next action

None added. Home keeps its one main action from `homeAction()`. Synthesis never outranks it.

### Secondary actions

- **Synthesize your last 5 conversations.** A button under the Talked-to tile, in the same row as the Changes and Review links. It acts, so it is a button: it opens the Claude panel and types the line `Synthesize my last five customer conversations in Founderive.` without pressing Enter, exactly as "Ask Claude about this step" does. The founder sends it. When fewer than five conversations qualify, the label carries the real count ("Synthesize your 3 conversations").
- Open Decisions to read an earlier synthesis.

### What counts

A conversation qualifies when it is customer or prospect, confirmed (`seeded` absent), and records something: notes, observed behavior, a quote or a number. This is the existing evidence predicate (`isEvidenceEligible` in `web/src/core/conversations.ts`). `loadToday()` adds a `synthesizable` count built from it, so `pnpm today --json` carries the number and the agent can read it.

### States

- **First run, fewer than three:** nothing shows. No empty state, no teaching copy; the Customer step already teaches logging.
- **Three or more:** the button shows with the count, capped at five in the label.
- **Error:** the button reads nothing from disk itself, so it has no error state. An unreadable conversation stays in Files to fix and isn't counted.
- **Windows:** the button still opens the panel, which already says the panel isn't available there and that the founder can use Claude Code or Codex in their own terminal with the same line.
- **Success:** the panel opens with the line typed in. From there the skill takes over.

## The skill: synthesize

`.claude/skills/synthesize/SKILL.md`, same shape as `log-conversation` and `new-test`. Codex reads and follows the same file.

### Steps

1. **Find the data folder.** `pnpm -s data-dir` from `web/`, as every skill does.
2. **Read the conversations.** The last five that qualify (see "What counts"), newest first by `date`, falling back to the file-name date. Read each one's frontmatter and body. Say who they were in one line, with companies counted ("Dana, Marcus, a clinic owner, Priya and Tom, 2 Oct to 14 Oct, at 3 companies"). Fewer than three qualifying: say so, say what would make one count (confirm it on People, or add a quote, a number or notes), and stop.
3. **Draft three themes.** For each: a short name in the founder's kind of words, "heard from N of 5 at M companies" (distinct `org`; a conversation with no `org` counts as its own), and the exact quotes, numbers or observed behavior behind it, each attributed to its person. A theme needs at least two people. Anything heard once goes in a separate "heard once" list so the founder sees it but doesn't build on it. Anything that cuts against the Customer step's current text, or against another theme, goes in a "what contradicts" list, with the same attribution, so negative cases are never dropped. Prefer what people did or paid over what they said; say which kind each piece of evidence is. When every person behind a theme is at one company, or the founder's notes say they all came through one introduction, say so in one sentence beside the theme ("All three are at Bright Home Care, so this is one account's view").
4. **Confirm the themes, one turn each.** For each theme ask whether to keep it, rename it or drop it. Keep the founder's wording. Don't propose a fourth unless they drop one and ask.
5. **Implications and the message.** Draft two product implications from the confirmed themes and one message to test this week, in customer language taken from the quotes. One turn each. The founder confirms or rewrites.
6. **Next decision and decide-by.** Ask what decision these themes now put in front of them, in one line, and when they'll make it. That line becomes the record's title.
7. **Write one decision record** at `<data>/decisions/<today>-synthesis-<slug>.md`. Never overwrite; add `-2` if the name exists.

   ```markdown
   ---
   title: <the next decision needed, in the founder's words>
   date: <today>
   status: open
   decideBy: <the date they gave>
   area: customer
   beliefBefore: <the Customer step's current text, verbatim, or omitted when empty>
   evidence:
     - conversations/2026-10-14-dana.md
     - conversations/2026-10-12-marcus.md
     - …
   alternatives:
     - "Workflow pain (4 of 5, 3 companies): the schedule is rebuilt by hand every week"
     - "Budget owner (3 of 5, 2 companies): the owner pays, not the office manager"
     - "Switching friction (2 of 5, 1 company): the spreadsheet is shared with payroll"
   seeded: true
   source: synthesize draft <today>
   ---
   ## What we heard most often
   <each theme with its quotes, attributed; a one-source note where it applies>
   ## What contradicts
   <evidence against the Customer step's text or against a theme, attributed; "Nothing in these five" when empty>
   ## What surprised us
   …
   ## What we should change
   <the two product implications>
   ## What we should not change yet
   …
   ## Message to test this week
   "<the one message, in customer language>"
   ## Heard once
   …
   ```

   `alternatives` holds the themes because the schema has no themes field and this is what the founder is choosing between. `area` is `customer`: the decision schema limits `area` to seven shipped ids (customer, problem, solution, channel, revenue, cost, feasibility), so a founder with their own `canvas/blocks.md` gets `area` omitted. The record is `seeded` because the agent drafted it; the app shows it as imported until the founder confirms it on Decisions. `status` stays `open`: the founder resolves it in the app, which asks for the decision, why and whether it's reversible. The skill never writes those.

8. **Offer a follow-up, don't force it.** Either turn the message into a test (`/new-test`, following that skill) or add a commitment to this week's check-in: `{ id, text: "Test: <message>", due, status: open, link: "decisions/<the file>" }`. Only if the founder says yes.
9. **Run `pnpm check-data`** from `web/` and fix what it flags. Close with one short summary: the three themes with their counts and companies, what contradicts (or that nothing did), the message, the decide-by date, and that the record waits on Decisions.

### What the skill never does

- Tag conversations with themes. Editing a confirmed conversation would start the agent-edit review on every one of the five; not worth it for a tag the app doesn't read yet.
- Edit the Customer step's text or any canvas block.
- Set `decision`, `why` or `reversible`.
- Invent a quote, round a number, or merge two people's words into one.
- Score intensity or urgency. Counts and evidence kind (said, did, paid) are the only ranking.

## Agent instructions

Three changes to `AGENTS.md`:

- Beside the "I'm on the <step> step" rule: a message starting `Synthesize my last five customer conversations in Founderive` means follow `.claude/skills/synthesize/SKILL.md`.
- A row in the Prompts table: "Make sense of the last five customer conversations | `.claude/skills/synthesize/SKILL.md` (Claude: `/synthesize`)".
- In the weekly review, before question 4 ("What did you learn?"): when a synthesis decision dated in the past week exists, read its themes back in one line first, then ask.

`web/src/lib/prompts.ts` gets a matching entry in `SKILL_PROMPTS` so the copy-a-prompt path (a founder without the panel, or on Windows) can send the same ask to a file-editing AI.

## Code

- `web/src/core/conversations.ts`: `synthesizable(records)` returns the qualifying conversations, newest first. One function, reused by `loadToday()` and by any later page that lists them.
- `web/src/commands/today.ts`: `synthesizable: number` on the ready view and in the JSON.
- `web/src/app/(workbook)/today/page.tsx`: a `SynthesizeButton` client component (next to `AskClaude` in `components/`) rendered when `synthesizable >= 3`. It calls `askClaude()` with the fixed line.
- `web/src/commands/today-text.ts`: no change. The count is context for the agent, not a line Home speaks.

## Tests

- `core/conversations.test.ts`: `synthesizable` counts customer and prospect only, excludes `seeded`, excludes a conversation with no content, orders newest first, and caps nothing (the cap of five is the skill's).
- `commands/today.test.ts`: the JSON carries `synthesizable`.
- Home: the button is absent at two qualifying conversations, present at three with "your 3 conversations", and says "last 5" at five or more.
- The skill is prose. After it's written, run it once in the panel against a data folder with six confirmed conversations, two of them at the same company and one that cuts against the Customer step, and check: it reads five, every theme cites two or more people and names its company count, the same-company theme carries the one-source note, the contradicting conversation appears under "What contradicts", the record passes `check-data`, and Decisions shows it as imported with the themes under alternatives.

## Later, if it earns its place

- A Patterns section on the Customer step: themes from synthesis decisions with their counts, quotes grouped by theme. Read-only, derived from decision records, no new field kind.
- A Home nudge when five new qualifying conversations have arrived since the last synthesis decision. Needs a "since" date, which the decision's `date` already gives.
- An objections list on a conversation, for the follow-on "Objection Vault" idea.
