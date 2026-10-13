---
name: new-test
description: Write one venture test in the founder's tests/ folder when the founder already knows what they want to test. Insists on success and failure criteria before results. Use when a founder says "I want to test whether…" or "set up a test". For choosing what to test, use hypothesis-engine.
---

# New venture test

## Find the data folder

Run `pnpm -s data-dir` from the repo's `web/` folder, first, before reading or writing anything. It prints the absolute path of the founder's data folder. Below, `<data>` means that path: use it for every read and write, and never assume `founder-data/` or any other hard-coded folder name.

1. Ask for, one at a time, and push for specifics:
   - the belief, as a claim that could turn out false
   - why it might be wrong (optional)
   - the smallest real action that would test it
   - success criteria: what result counts as supported, with a number
   - failure criteria: what result would prove it wrong, with a number
   - the area: customer, problem, solution, channel, revenue, cost or feasibility
   - a date to decide by, and whether they're starting now
2. Write `<data>/tests/<YYYY-MM-DD>-<slug>.md` in the exact shape shown in `.claude/skills/hypothesis-engine/SKILL.md` ("File to write"), dated today. Use `status: running` with `startedOn: <today>` if they're starting now; otherwise `status: planned`. Mark it `seeded: true` with `source: new-test draft <today>`, since you're drafting it from the conversation, not the founder's own form; it shows as "Imported — confirm" until the founder confirms it in the app. Never overwrite; add `-2` if the name exists.
3. If they name conversations that are evidence, link both sides: the conversation paths in `relatedConversations`, and this test's path in each conversation's `relatedTests` — both sides, or `check-data` will warn about a one-sided link. Only a customer or prospect conversation counts as evidence; mentor, partner and investor conversations are advice and can still be linked.
4. Never set `result`, `decision` or `closedOn`. Tell the founder a supported or contradicted result will need a customer or prospect conversation linked back to the test, or their own notes under `## Evidence` — that's the app's rule when they complete it, not something you set here.
5. Run `pnpm check-data` from `web/` and fix anything flagged. Tell the founder it's on the Tests page, and that completing it there asks for a result first, then a decision.
