---
name: validation-planner
description: Turn one venture test into a plan with real numbers (a 2-day action, a 2-week milestone, a 2-month signal, funnel math and thresholds), then write it into the test and this week's commitments. Use after a test exists, or when a founder asks "how do I actually run this test?"
---

# Validation planner

Adapted from the validation-planner skill in the Founder Jam Skills Pack (Innovate Charlotte and StealthX, CC0 1.0). Rewired for Founderive: it plans an existing venture test and writes to the founder's data folder. See ATTRIBUTION.md.

## Find the data folder

Run `pnpm -s data-dir` from the repo's `web/` folder, first, before reading or writing anything. It prints the absolute path of the founder's data folder. Below, `<data>` means that path: use it for every read and write, and never assume `founder-data/` or any other hard-coded folder name.

## Read first

- The test in `<data>/tests/`. If several are planned or running, ask which. A test that's `complete` or `abandoned` is closed and frozen — never plan one; tell the founder and offer to plan a follow-up test instead (`new-test` or `hypothesis-engine`).
- `<data>/founder.md` (businessModel, hoursPerWeek, commitment) and recent `<data>/conversations/`.
- This week's check-in, `<data>/checkins/<YYYY>-W<ww>.md` (ISO week, starting Monday).

## Steps

1. **Three horizons, one at a time.** Push for what exactly, to whom and how many:
   - 2 days: the smallest real action that tells the founder something.
   - 2 weeks: a milestone with a number.
   - 2 months: the signal that would justify investing more.
2. **Funnel math.** Work back from the target in the test's success criteria. Start from one of these and adjust to the founder's model and real numbers. Say plainly that they're rough starting points, not benchmarks.
   - Selling to businesses: 250 cold emails → 50 visits → 36 sign-ups → 18 qualified → 9 calls → 3 customers.
   - Selling to consumers online: 1,000 impressions → 100 clicks → 70 sign-ups → 35 qualified → 10 replies → 3 customers.
   - Local or service business: 40 people asked in person or by referral → 15 conversations → 6 quotes → 3 customers.
3. **Thresholds.** Map them onto the test:
   - Green (70% or more of the target) is the success criteria.
   - Red (under 40%) is the failure criteria.
   - Yellow (in between) will likely be an inconclusive result. Agree now what the founder will do then, usually fix the weakest funnel step.
   If the test's criteria are vague, propose numeric ones and ask the founder to confirm. Never change the criteria of a running test without the founder's explicit yes.
4. **Accountability.** Ask who will hold them to it and when they'll check in.
5. **Write.**
   - In the test file, add or replace a `## Plan` section at the top of the body (above `## Evidence`) with the three horizons, the funnel table and the Yellow rule. Leave the other sections, and the frontmatter, alone — you're filling in the founder's plan for a test they (or an earlier skill) already set up, not drafting a new record, so don't add `seeded` or `source` here.
   - Add the 2-day action, and the 2-week milestone if it falls this week, to this week's check-in `commitments`: `id: c-<random>`, `text`, `due`, `status: open`, `link: tests/<file>.md`. If the check-in file doesn't exist, create it with `week: <YYYY>-W<ww>`, `commitments` and `nextStepLog: []`.
   - Give five calendar reminders as plain text for the founder to add themselves.
6. Run `pnpm check-data` from `web/` and fix anything flagged.
