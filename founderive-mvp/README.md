# founderive MVP

A standalone browser prototype for a founder-owned self-diligence brief. It converts 15 high-signal founder questions into a local, evidence-first guided conversation and an exportable summary.

## Run locally

Open `index.html` in a modern browser, or serve this folder:

```sh
python3 -m http.server 8011 --directory founderive-mvp
```

Then visit `http://localhost:8011`.

## MVP flow

1. Create a local preview account, or sign back in on the same browser.
2. Use the dashboard to start, resume, publish, unpublish, or delete distinct founder briefs.
3. Browse every question in the left-hand map and jump directly to any prompt.
4. Send with Enter or add a line break with Shift+Enter; the composer grows with the response.
5. Confirm or revise a saved response, mark evidence, and choose **Save and exit** whenever needed.
6. Publish any brief to create a randomized preview link, copy it, or make the brief private again.
7. Return to the dashboard later, then export the active founder brief as Markdown or a PDF.

## State matrix

| State | Behavior |
| --- | --- |
| Empty | A visitor can create a free local preview account, then begins from a clean workspace and can create a first brief. |
| In progress | Each brief preserves its own question map, Coach transcript, auto-growing composer, confirmation/edit cards, and save-and-exit state. |
| Published | Publishing produces a 192-bit randomized preview token, copyable link, and same-browser read-only shared view; unpublishing immediately removes the preview record. |
| Success | The dashboard shows all saved briefs and their statuses; the active brief provides evidence completeness, Markdown export, and print/PDF. |
| Error | Missing signup details, a password mismatch, incorrect sign-in details, and blocked local storage receive direct next-step copy. |

## Product decisions

- Scores indicate **answer completeness and available proof**, never founder potential or personality.
- A preview account and all of its briefs live only in `localStorage`. The password is never retained in raw form, but this is not a secure hosted authentication system; use a temporary password.
- Publishing generates a randomized link token, but its snapshot also remains in `localStorage`, so the link only resolves in the originating browser. The dashboard labels this boundary directly instead of representing it as real external sharing.
- No backend, analytics, or remote requests: answers are private by default in the current browser.
- Prompts are grounded in the supplied founder diligence research, especially commitment, reality-testing, execution, sustainable resilience, and integrity.
- The Coach-like experience is a UI pattern in this prototype—not an AI model or simulated assessment. It preserves the original guided prompts and waits for a real AI integration before generating any dynamic follow-ups.
- The “founder foundation” panel uses short excerpts of the founder’s own first three responses. It does not claim to infer or summarize facts on their behalf.

## Production transfer path

1. Move the question model, transcript model, account profile, and scoring into typed application data (`lib/founderive.ts`).
2. Replace the local preview account with Supabase Auth and replace per-browser brief storage with owner-scoped Supabase records and RLS.
3. Migrate the local account once, using a verified email, and never transfer the preview password or hash to Supabase.
4. Add a server-side Coach endpoint that emits a response plus approved structured evidence; keep the existing 15-prompt sequence as its safety rail.
5. Store a server-side public-share token (hash it at rest), enforce revocation/expiry, and resolve the existing share route to a read-only public brief before enabling mentor/investor links.
6. Add server-side Markdown/PDF generation and versioned responses.
7. Test consent copy, data retention, password-reset flows, mobile form behavior, keyboard navigation, and screen-reader labels with real founders before handling sensitive personal information.
