# Founderive web app

The Next.js app behind Founderive. To use it, run `node start.mjs` from the repo root; see the [main README](../README.md). This file is for working on the code.

## Run

```sh
pnpm install
pnpm dev          # http://127.0.0.1:3000
pnpm test         # unit and integration tests
pnpm build        # production build
```

Tests never touch real founder data: they run against a temporary folder, and the data path refuses to resolve to a real one under Vitest.

## Where things live

| Path | What |
|---|---|
| `src/app/(workbook)/` | The workbook: setup, Today, canvas, conversations, tests, decisions, import, feedback |
| `src/store/` | The only code that reads or writes founder-data |
| `src/core/` | Deterministic rules with tests: the next step (`next-step.ts`), evidence, weeks, privacy checks |
| `src/commands/` | The operations behind the app's forms and the `pnpm` scripts |
| `scripts/` | `today`, `check-data`, `data-dir`, `init-data` |
| `src/app/api/data-events/` | Watches founder-data so the app updates when an assistant writes |
| `src/app/demo/` | The early clickable mockup (see below) |

Read `AGENTS.md` in this folder before using Next.js APIs: this is Next 16 with Cache Components, so pages that read data `await connection()` inside `<Suspense>`.

## The demo mockup

`/demo` is an early mockup of how a founder program might use Founderive, with a founder side and a program-team side. It runs on fictional fixture data (`src/data/fixtures/`), keeps its state in memory, and resets on reload. It doesn't read founder-data.

It's client-only, so all of its fixture data is loaded in the browser. A real program view would build its data on the server and scope it to the program and the founder's consent.
