---
name: hypothesis-engine
description: Find the founder's riskiest assumptions and turn the one they pick into a venture test in the founder's tests/ folder. Diverges to 6-10 candidates, scores them, converges to 2-3, and writes the founder's choice. Use when a founder asks what to test, isn't sure what's riskiest, or says "help me pick a test".
---

# Hypothesis engine

Adapted from the hypothesis-engine skill in the Founder Jam Skills Pack (Innovate Charlotte and StealthX, CC0 1.0). Rewired for Founderive: it reads the founder's record and writes a venture test file. See ATTRIBUTION.md.

## Find the data folder

Run `pnpm -s data-dir` from the repo's `web/` folder, first, before reading or writing anything. It prints the absolute path of the founder's data folder. Below, `<data>` means that path: use it for every read and write, and never assume `founder-data/` or any other hard-coded folder name.

## Read first

- `<data>/founder.md`: stage, businessModel, targetCustomer, problem, oneLiner, outcome30, hoursPerWeek.
- `<data>/canvas/*.md` (current beliefs) and `<data>/conversations/*.md` (what people said and did).
- `<data>/tests/*.md`, so you don't propose a test that's already running or done.

If something you need is missing, ask. Don't guess.

## Steps

1. **Frame.** Show the two shapes a good hypothesis takes:
   - Outcome: "If we [change], then [specific customer] will [measurable behavior] by [date]."
   - Commitment: "We believe [customer] will [pay, sign, switch or come back] for [outcome]. We'll know by [a small, real action] within [time]."
   These fit any business: a price for a service, a deposit for a product, a signed letter from a partner. Don't assume software or a subscription.
2. **Diverge.** Generate 6-10 candidate assumptions, H1 to Hn, spread across the areas customer, problem, solution, channel, revenue, cost and feasibility. Use the founder's own words from their conversations. Show a table: id, area, assumption.
3. **Evaluate.** Score each 1-5 on desirability, feasibility, viability and risk (how badly it hurts if it's wrong). Show the table with totals. Flag any total under 8 as probably not worth testing now. Check feasibility against the founder's stage and hours per week.
4. **Converge.** Develop the top 2-3: the outcome statement, the commitment statement, why this one (2-3 sentences), the fastest way to be wrong (one sentence) and a one-paragraph test plan.
5. **The founder picks one.** Ask which to test. Never pick for them.
6. **Agree the thresholds.** Ask for the success and failure criteria in the founder's words, with numbers, before writing anything. Ask whether they're starting now (`running`, with `startedOn` set to today) or later (`planned`).
7. **Write the test** (below), then run `pnpm check-data` from `web/` and fix anything flagged. Tell the founder the file path, that it's on the Tests page in Founderive, and that it shows as "Imported — confirm" until they confirm it there.

Challenge throughout, kindly:
- "Which assumption are you avoiding because it would mean the most change? That's probably the one."
- "What's the fastest way you could find out you're wrong?"
- "Are you testing a real risk, or confirming something you already believe?"
- "What would it take to prove this wrong in two weeks?"

## File to write

`<data>/tests/<YYYY-MM-DD>-<slug>.md`, dated today, with a short lowercase-hyphen slug. If the name exists, add `-2`. Never overwrite a file.

```markdown
---
title: Ask agency owners to pay for a scheduling pilot
area: revenue
status: planned
belief: Agency owners will pay $200 a month to stop rebuilding schedules by hand
risk: They feel the pain but won't pay for a new tool yet
test: Offer a paid four-week pilot to five qualified agency owners
successCriteria: At least two sign a paid pilot at $200 a month
failureCriteria: None accept after five qualified offers
due: 2026-10-27
relatedConversations: []
evidenceStrength: none
seeded: true
source: hypothesis-engine draft 2026-10-13
---
## Evidence

## What we learned

## Decision and why
```

- `area` is one of customer, problem, solution, channel, revenue, cost, feasibility. `status` is `planned` or `running`.
- You're drafting this from a conversation, not writing it on the founder's own form, so it always carries `seeded: true` and `source: "hypothesis-engine draft <today>"`. The founder clears `seeded` by confirming the test in the app; never clear it yourself.
- If the founder confirms a conversation is evidence for this test, add its path to `relatedConversations` and add this test's path to that conversation's `relatedTests` (both sides, or `check-data` will warn about a one-sided link). Only a customer or prospect conversation counts as evidence; mentor, partner and investor conversations are advice and can still be linked, but won't count toward a result later. A result of supported or contradicted also needs that conversation confirmed (not `seeded`) and linked back to the test, or the founder's own notes under `## Evidence` — that's the app's rule when they complete the test, not something you set here.
- Never set `result`, `decision`, `closedOn` or `nextCommitment`. The founder completes the test in the app.
- Fields are strict. Anything extra goes under `extensions:`.
