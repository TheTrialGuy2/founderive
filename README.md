# founderive

founderive helps founders derive the honest, evidence-backed story a serious partner needs to understand. It turns high-signal diligence questions into a calm guided conversation, then organizes the answers into a practical founder brief.

It is deliberately not a pitch-deck generator or a personality score. The goal is clearer founder self-awareness, stronger supporting evidence, and a useful starting point for investor, mentor, or cofounder conversations.

## What works in the MVP

- A guided 15-question founder self-diligence conversation across five dimensions: motivation, reality-testing, execution, resilience, and trust.
- A ChatGPT-like writing flow with saved responses, evidence markers, question jumping, confirmation, and save-and-exit.
- A local preview account with a lightweight founderive workspace.
- Multiple independent briefs: start, continue, review, publish, unpublish, and delete each one.
- Markdown download and print/PDF export for the active brief.
- A randomized 192-bit preview link and read-only shared view.

## Run locally

The MVP is a standalone browser app—no build step or dependencies required.

```sh
python3 -m http.server 8011 --directory founderive-mvp
```

Then visit [http://localhost:8011](http://localhost:8011).

You can also open [founderive-mvp/index.html](founderive-mvp/index.html) directly in a modern browser. Serving it locally is recommended for the best browser-storage behavior.

## Current storage and sharing boundary

This is a browser-local MVP. Accounts, briefs, and preview share snapshots are stored in `localStorage` in the originating browser.

The publish flow creates a hard-to-guess token and a working same-browser preview link. It is intentionally labeled as a preview: it will not resolve on another device until briefs and share records are backed by hosted storage.

Do not use a password you reuse elsewhere—the local account is a product-flow preview, not production authentication.

## Project structure

| Path | Purpose |
| --- | --- |
| [`founderive-mvp/index.html`](founderive-mvp/index.html) | Complete static MVP: visual UI, guided flow, local storage, account workspace, and exports. |
| [`founderive-mvp/README.md`](founderive-mvp/README.md) | MVP interaction details, state matrix, and production-transfer notes. |
| [`founder-investor-diligence.md`](founder-investor-diligence.md) | Founder diligence research and question framework. |
| [`What Investors, Accelerators, and Grant Programs Actually Want to Know About Founders.md`](<What Investors, Accelerators, and Grant Programs Actually Want to Know About Founders.md>) | Supporting research on what external evaluators look for. |

## Next production steps

1. Replace the local account with Supabase Auth.
2. Store briefs in owner-scoped Supabase tables with RLS.
3. Resolve share tokens server-side, with revocation and expiration controls.
4. Add a real AI coach that can ask safe, context-aware follow-ups while retaining the core 15-question framework.
