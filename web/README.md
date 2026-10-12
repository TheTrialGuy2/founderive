# Founderive — clickable wireframe

A Next.js skeleton of Founderive with **fixture data and no database**. It shows both sides of the product:

- **Founder:** onboarding, Today, Journey, program workspace, conversations, mentors, progress, capital readiness, check-in, sharing.
- **Program team:** overview, cohort pulse, founder view (Program + Reported layers only), program builder, capital pipeline and funder report.

Everything is fictional (Dana Reyes / Tandem, "Queen City Founders Network"). Change the org name in `src/config.ts`.

## Run

```sh
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit tests for the deterministic core
pnpm build        # production build
```

Demo state (approved conversations, check-ins, opt-ins, builder edits) lives in memory and resets on reload. Navigate with the in-app links during a demo.

## Storyline (click path)

1. **Today**: 2-week streak, 13/15 interviews. Tap a circle to tick a follow-up.
2. **Program**: Session 5 homework shows what each item builds in the record.
3. **+** (Log) → *Use sample notes* → *Draft write-up* → *Approve & file*. The interview homework ticks itself ("auto").
4. **Progress**: interviews now 14/15, the same number everywhere.
5. **Program**: *Skip* the worksheet (pick a reason), then tap the halfway check's circle. Back on Today, the streak is 3 and "Next" points to readiness.
6. **Mentors**: agenda pre-filled from the record. Scheduling is in Persto.
7. **Capital**: Momentum flips to supported (3 of 7). Only NC IDEA MICRO's bar (3) is met, so it's the only partner you can share with.
8. **Check-in**: *Correct* capital raised to `$20,000`, then *Confirm all*.
9. Switch to **Program team** → **Overview**: capital includes the corrected $20,000. → **Cohort pulse**: the weekly streak grid, check-ins 9/10, Dana on track.
10. **Founders**: Dana's private content shows as locked.
11. **Capital & reports**: Tandem opted in to MICRO. Switch report templates.
12. **Program builder**: publish homework → *Preview as founder*.

## Known limits (by design, for a wireframe)

- **No data boundary.** This is a client-only demo, so all fixture data, Private included, is loaded in the browser. `operatorView` controls what operator screens *render*. Real enforcement is server-side: RLS plus an operator view built on the server and scoped to the operator's program and the founder's enrollment.
- Upload recording, transcript and voice note, Persto links, and PDF/CSV export are placeholders.
- Not built yet: pipeline actions, cohort sort/filter, editing materials or existing homework in the builder.

## Where things live

| Path | What |
|---|---|
| `src/data/types.ts` | Entity shapes (mirror the future Postgres schema) |
| `src/data/fixtures/` | Demo data |
| `src/data/repo.ts` | The only data source pages import; becomes Supabase queries later |
| `src/core/` | Deterministic, tested rules: metrics, visibility, engagement, readiness, simulated agent |
| `src/state/` | Demo store (React context) and the values derived from it |
| `src/app/founder`, `src/app/operator`, `src/app/onboarding` | Screens |
| `src/app/design-system` (`/design-system`) | Handoff reference: rules, color, type, icons, every component state |
| `src/components/icons.tsx` | The one icon registry (Lucide SVGs) |
