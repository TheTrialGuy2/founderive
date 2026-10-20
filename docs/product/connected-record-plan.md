# Connected Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five features borrowed from how Obsidian connects a vault, in build order: Referenced by, Topics, Mentioned not tagged, Find, and Cited quotes. Each one ships on its own and leaves the app working.

**Architecture:** Each feature is a pure core module (`web/src/core/…`) with the rules and tests, a thin command (`web/src/commands/…`) that reads through the store, and a few components. Only three schema changes are made:
- Topics use the `concepts` field every kind already allows, so it needs no schema change. check-data adds warnings only.
- Cited quotes add one field, `cited`, to `decisionSchema`.
- Referenced by is worked out on each page load from links that already exist, so nothing new is stored and there's no new link rule.

**Tech Stack:** Next 16 (Cache Components, `await connection()` inside `<Suspense>`), React 19, TypeScript, Zod 4 schemas in `web/src/store/schemas.ts`, Vitest (`pnpm test` from `web/`), pnpm.

Spec: `docs/product/connected-record-direction.md`. Read it first. Copy in this plan comes from it; where they differ, the brief wins.

This plan gives each task's files, interfaces and test expectations. Unlike `close-the-loop-plan.md`, it doesn't write out full code, because five features at that level of detail would go stale before they're built. Before starting a feature, the implementer may expand its tasks into that format.

## Global Constraints

- Everything under `web/` runs from `web/`: `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm -s check-data`.
- `web/src/store/` is the only code that reads or writes founder-data. Core modules are pure and take records as arguments.
- The founder decides. Topics are added by the founder (form, Save topics or Add topic). The agent adds topics only to records it drafts as imports, or when told to in so many words. Nothing adds a topic automatically, and nothing infers a citation.
- Topics never feed Home, the path, evidence counts, `homeAction()` or `pnpm today --json`.
- Imported records (`seeded: true`) take no topics and offer no quotes to cite until the founder confirms them.
- Links navigate and buttons act. Meaning never relies on color, an icon or a tooltip alone. Client components start with `"use client"`.
- Dates are `YYYY-MM-DD`. The fixture in `web/test-data` pins `today: 2026-10-13`; `useTempData()` copies it. The fixture has these links, which the tests below use:
  - `decisions/2026-10-09-focus-on-small-agencies.md` lists `conversations/2026-10-08-dana-ortiz.md` under `evidence` and `tests/2026-10-06-paid-pilot.md` as `relatedTest`.
  - Dana's quote is `I lose my whole Friday afternoon to the schedule.`, and her numbers include `4 hours a week on scheduling`.
- Commit after every task. One branch per feature (`feat/referenced-by`, `feat/topics`, `feat/topic-mentions`, `feat/find`, `feat/cited-quotes`), each from the main branch after the previous one merges.
- No React rendering tests exist in this codebase. Components are checked by `pnpm lint`, `pnpm exec tsc --noEmit` and each feature's dry run. Behavior lives in core and commands, which are tested.

---

## Feature 1: Referenced by

### Task 1.1: Core, references to one record

**Files:**
- Create: `web/src/core/references.ts`
- Test: `web/src/core/references.test.ts`

**Interfaces:**
- Consumes: `byNewestDecision`, `decisionHref(index, rel)` from `core/decision-order.ts`.
- Produces:
  - `type ReferenceField = "evidence" | "against" | "relatedTest"`
  - `type Reference = { from: string; title: string; open: boolean; field: ReferenceField; href: string; quotes: string[] }`. `quotes` stays empty until Feature 5.
  - `referencesTo(target: string, decisions: { path: string; data: DecisionLike }[]): Reference[]`. `decisions` must already be in page order (`byNewestDecision`), so `href` lands on the right page.
  - `referenceLabel(field: ReferenceField): string`, giving "Evidence for", "Against" or "Decided from this test".

- [ ] **Step 1: Write the failing tests.** Cases:
  - A decision listing the target under `evidence` gives one reference with `field: "evidence"` and `href` from `decisionHref` at that decision's index.
  - `against` gives `field: "against"`. A target that is a decision's `relatedTest` gives `field: "relatedTest"`.
  - A decision listing the same target under both `evidence` and `relatedTest` gives two references (schema forbids evidence+against, not this pair).
  - A decision never references itself, even if a hand edit lists its own path.
  - `open` is `true` for `status: "open"`.
  - The 21st decision in page order gets a `?page=2` href (`PAGE_SIZE` from `lib/pagination.ts`).
  - Order: references come back in the decisions' page order.
- [ ] **Step 2:** Run `pnpm test src/core/references.test.ts` and see it fail.
- [ ] **Step 3:** Implement. Keep it a single pass over `decisions`.
- [ ] **Step 4:** Run the tests and see them pass.
- [ ] **Step 5:** Commit: `feat: work out which decisions cite a record`.

### Task 1.2: Load references for a page

**Files:**
- Create: `web/src/commands/references.ts`
- Modify: `web/src/commands/conversations.ts` (`ConversationView`, `loadConversation`), `web/src/commands/venture-tests.ts` (`TestView`, `loadTest`), `web/src/commands/decisions.ts` (`DecisionRow`, `loadDecisions`)
- Test: `web/src/commands/references.test.ts`, plus one assertion each in the existing `conversations.test.ts`, `venture-tests.test.ts` and `decisions.test.ts`

**Interfaces:**
- Produces:
  - `type ReferencesResult = { ok: true; references: Reference[] } | { ok: false }`
  - `loadReferences(target: string): Promise<ReferencesResult>`, which reads decisions once with `listEntries("decision")` and skips unreadable ones. It returns `{ ok: false }` only when the listing itself throws.
  - `ConversationView` and `TestView` (ok variants) gain `references: ReferencesResult`.
  - `DecisionRow` gains `citedBy: Reference[]`. It's computed from the `entries` that `loadDecisions` already has, with no second read.

- [ ] **Step 1: Write the failing tests** with `useTempData()`:
  - `loadReferences("conversations/2026-10-08-dana-ortiz.md")` gives one `evidence` reference titled `Focus on agencies with 10-50 caregivers`.
  - `loadReferences("tests/2026-10-06-paid-pilot.md")` gives one `relatedTest` reference.
  - After writing a broken decision file (bad YAML) that cites Dana, the result is still `ok` with the one good reference.
  - `loadConversation("2026-10-08-dana-ortiz")` carries the same references.
  - A second decision that lists the first under `evidence` makes the first's `DecisionRow.citedBy` hold it.
- [ ] **Step 2:** Run the tests and see them fail.
- [ ] **Step 3:** Implement, with `loadConversation` and `loadTest` calling `loadReferences` in their existing `Promise.all`.
- [ ] **Step 4:** Run `pnpm test` and see it pass.
- [ ] **Step 5:** Commit: `feat: conversation, test and decision views carry what cites them`.

### Task 1.3: The Referenced by card and line

**Files:**
- Create: `web/src/components/workbook/ReferencedBy.tsx` (server component)
- Modify: `web/src/app/(workbook)/conversations/[slug]/page.tsx`, `web/src/app/(workbook)/tests/[slug]/page.tsx`, `web/src/app/(workbook)/decisions/page.tsx`

**Copy (verbatim):**
- Card title: `Referenced by`
- Row: `<label>: <title>`, with ` · open question` after an open decision's title. The title is the link.
- Error: `Couldn't read your decisions, so references aren't shown. The rest of this page is up to date.`
- Decision card line: `Cited by 1 decision: <title>` or `Cited by 2 decisions: <title>, <title>`, each title a link.

- [ ] **Step 1:** Build `ReferencedBy({ result })`. It renders nothing when the result is ok and empty, groups rows by field in the order evidence, against, relatedTest, and uses `<ul>` with real links.
- [ ] **Step 2:** On the conversation page, place it after the Linked tests card, spanning both columns when it's the last card. On the test page, place it after the linked-conversations card.
- [ ] **Step 3:** On the decision card, add the `Cited by` line under the Evidence and Against lists, only when `citedBy` is non-empty.
- [ ] **Step 4:** Run `pnpm lint && pnpm exec tsc --noEmit`.
- [ ] **Step 5: Dry run.** Run `pnpm dev` against a copy of `test-data` (`FOUNDER_DATA_DIR=<copy> pnpm dev`). Check that:
  - Dana's page shows `Evidence for: Focus on agencies with 10-50 caregivers`.
  - The paid-pilot test page shows `Decided from this test: …`.
  - Each link lands on the decision's anchor.
  - With no decisions, no card shows.
- [ ] **Step 6:** Commit: `feat: Referenced by on conversations, tests and decisions`.

---

## Feature 2: Topics

### Task 2.1: Core, topic rules

**Files:**
- Create: `web/src/core/topics.ts`
- Test: `web/src/core/topics.test.ts`

**Interfaces:**
- Consumes: `slugify` from `core/slug.ts`.
- Produces:
  - `TOPIC_MAX_LENGTH = 40`, `TOPICS_MAX = 8`
  - `topicKey(topic: string): string`, which applies NFKC, trims, collapses inner whitespace and lowercases it. Two topics are the same when their keys are.
  - `topicSlug(topic: string): string`, which is `slugify(topicKey(topic))`.
  - `parseTopicsField(text: string): { ok: true; topics: string[] } | { ok: false; error: string }`. It splits on commas, trims, drops empties, and de-duplicates by key, keeping the first spelling and the founder's order. The errors are:
    - more than 8: `Use up to 8 topics.`
    - one over 40 characters: `Keep each topic under 40 characters: “<first 20>…”.`
  - `type TopicRecord = { kind: "conversation" | "test" | "decision"; path: string; title: string; date: string; href: string; concepts: string[] }`
  - `topicIndex(records: TopicRecord[]): { slug: string; name: string; count: number }[]`. It sorts by count, most first, then by name. `name` is the spelling used most often, with the newest record breaking a tie. Topics whose slugs collide are merged under one slug.
  - `recordsWithTopic(slug: string, records: TopicRecord[]): Record<"conversation" | "test" | "decision", TopicRecord[]>`, newest first in each.

- [ ] **Step 1: Write the failing tests:**
  - `topicKey(" Pricing  Page ")` is `pricing page`.
  - `parseTopicsField("pricing, Pricing , onboarding,,")` gives `["pricing", "onboarding"]`.
  - 9 topics give the 8-topic error, and a 41-character topic gives the length error.
  - `topicIndex` with `Pricing` ×2 and `pricing` ×1 names it `Pricing`, with count 3.
  - On a 1–1 tie, the newer record's spelling wins.
  - `recordsWithTopic` groups by kind and sorts newest first.
- [ ] **Steps 2–4:** See the tests fail, implement, see them pass.
- [ ] **Step 5:** Commit: `feat: topic rules`.

### Task 2.2: check-data warns about topics

**Files:**
- Modify: `web/src/store/check.ts`
- Test: `web/src/store/check.test.ts`

The schema stays as it is (`concepts: z.array(z.string()).optional()` on every kind), so existing files keep validating. check-data adds a warning for each confirmed conversation, test or decision:
- `concepts: use up to 8 topics.`
- `concepts: "<topic>" is over 40 characters. Shorten it.`
- `concepts: "<topic>" is listed twice.` (same key)

- [ ] Write the failing tests, implement, run `pnpm test src/store/check.test.ts`, and commit: `feat: check-data flags long, duplicate or too many topics`.

### Task 2.3: Commands, write and load topics

**Files:**
- Create: `web/src/commands/topics.ts`
- Modify: `web/src/commands/conversations.ts`, `web/src/commands/venture-tests.ts`, `web/src/commands/decisions.ts` (parse `topics` in the three create-form parsers; `createConversation`, `createTest` and `createDecision` write `concepts` when non-empty and omit the key when empty)
- Test: `web/src/commands/topics.test.ts`, plus parser tests in the three existing test files

**Interfaces:**
- Produces:
  - `setTopics(rel: string, topics: string[]): Promise<void>`. It uses `updateEntry` on the record's kind (from `kindOf`). It refuses a seeded record with `Confirm this record before adding topics.` and an unknown kind with `Topics go on conversations, tests and decisions.` It writes `concepts` and deletes the key when the list is empty. Nothing else changes, not even the body.
  - `addTopic(rel: string, topic: string): Promise<"added" | "already">`. It reads the record and calls `setTopics` with the topic appended. It's idempotent by key, so a double click is harmless.
  - `loadTopicRecords(): Promise<{ records: TopicRecord[]; flagged: { path: string; error: string }[] }>`. It reads the three kinds and leaves out seeded records. Titles come from `person`/`org` for a conversation and `title` otherwise, the same rule as `loadLogged`. Hrefs come from `hrefFor` for conversations and tests, and `decisionHref` in page order for decisions.
  - `loadTopic(slug: string): Promise<{ status: "missing" } | { status: "ok"; name: string; groups: …; suggestions: Suggestion[] }>`. `suggestions` stays `[]` until Feature 3.

- [ ] **Step 1: Write the failing tests:**
  - `setTopics` on Dana writes `concepts: [scheduling]`, and the file's body and every other field are byte-identical.
  - `setTopics(…, [])` removes the key.
  - Seeded and unknown-kind records are refused with the messages above.
  - `addTopic` twice returns `"already"` the second time.
  - The three form parsers return the parse error under `errors.topics` and keep `values.topics`.
  - `loadTopic(topicSlug("scheduling"))` after tagging Dana and the test lists both, and `loadTopic("nope")` gives `missing`.
- [ ] **Steps 2–4:** See the tests fail, implement, see them pass.
- [ ] **Step 5:** Commit: `feat: save, add and load topics`.

### Task 2.4: Topics on forms and records

**Files:**
- Create:
  - `web/src/components/workbook/TopicsField.tsx` (the field, shared by the three create forms)
  - `web/src/components/workbook/TopicLinks.tsx` (server component that renders the links)
  - `web/src/components/workbook/TopicsForm.tsx` (client component: an "Edit topics" disclosure with the field and **Save topics**, using `useActionState` like the other forms)
  - `web/src/app/(workbook)/topic-actions.ts` (`setTopicsAction`, `addTopicAction`; both `revalidatePath` the record's page and `/topics`)
- Modify: `ConversationForm.tsx` (create mode only), `TestForm.tsx`, `DecisionForm.tsx`, the conversation and test pages, and the decision card.

**Copy (verbatim):**
- Field label `Topics (optional)`, hint `Short labels you'll want to find later, like pricing or onboarding. Separate with commas.`
- Disclosure: `Edit topics`. Button: `Save topics`.

- [ ] **Step 1:** Add the field and wire it to the three create forms. Errors render under the field and keep what the founder typed.
- [ ] **Step 2:** Add `TopicLinks` and `TopicsForm`. Both are hidden on a seeded record. On a closed test, `TopicsForm` still shows.
- [ ] **Step 3:** Run `pnpm lint && pnpm exec tsc --noEmit`, then commit: `feat: add and edit topics on conversations, tests and decisions`.

### Task 2.5: Topic pages

**Files:**
- Create: `web/src/app/(workbook)/topics/page.tsx`, `web/src/app/(workbook)/topics/[slug]/page.tsx`
- Modify:
  - `web/src/app/(workbook)/logged/page.tsx` (a `Topics` link beside its filter)
  - `web/src/lib/workbook-nav.ts` (add `/topics` to the `match` of Everything logged, so the nav highlights it)

**Copy:** as in the brief, under "Topics → States", word for word. The first-run Claude prompt to copy is `Suggest a few topics for my conversations in Founderive, and ask me before adding any.`, shown with `CopyPrompt`.

- [ ] **Step 1:** `/topics` shows every topic with its count, or the first-run state with `EmptyState` and `CopyPrompt`.
- [ ] **Step 2:** `/topics/[slug]` uses eyebrow `Topic` and the topic's name as title, then the sections Conversations, Tests and Decisions, hiding any that are empty. Unreadable records appear under Files to fix via `FlaggedFile`. An unknown slug shows the missing state.
- [ ] **Step 3:** Both pages `await connection()` inside `<Suspense>`.
- [ ] **Step 4: Dry run:**
  - Tag Dana and the test `scheduling`.
  - Check that `/topics` lists `scheduling · 2`, and that the topic page lists both with working links.
  - Check that `/topics/whatever` shows the missing state.
  - Check that a fresh data folder shows the first-run state.
- [ ] **Step 5:** Commit: `feat: topic pages`.

### Task 2.6: Tell the agent

**Files:** `AGENTS.md`, `.claude/skills/log-conversation/SKILL.md`, `.claude/skills/import-folder/SKILL.md`, `.claude/skills/synthesize/SKILL.md`

- [ ] **AGENTS.md, "What you write":** add the bullet:
  > **Topics** → `concepts` on a conversation, test or decision: short labels (≤ 40 characters, ≤ 8) the founder chose. Add them to a record you draft as an import when its source names the subject, and to a confirmed record only when the founder tells you to in so many words; on a confirmed conversation, add `agentEdit` with summary `Added topic <topic>` and `previous` set to the unchanged body. Never add topics to make a theme look bigger.
- [ ] **AGENTS.md, "Rules for founder-data":** add to the frozen-test sentence: `Topics are labels, not evidence: a closed test can take them.`
- [ ] **File kinds table:** add `concepts? [topics]` to the conversation, test and decision rows.
- [ ] **Skills:** in log-conversation and import-folder, the record they draft may carry `concepts` taken from the founder's own words. In synthesize, the skill reads existing topics when it names themes, but doesn't write topics.
- [ ] Run `pnpm test` (the agent-home tests read AGENTS.md), then commit: `docs: agents may add topics the founder names`.

---

## Feature 3: Mentioned, not tagged

### Task 3.1: Core, finding mentions

**Files:**
- Create: `web/src/core/mentions.ts`
- Test: `web/src/core/mentions.test.ts`

**Interfaces:**
- Produces:
  - `searchableText(kind, data, body): string[]`. It returns the fields listed in the brief, as separate strings in that order, without frontmatter keys.
  - `findMention(texts: string[], topic: string): { sentence: string; start: number; end: number } | null`.
    - It matches the whole phrase case-insensitively with Unicode word boundaries: `(?<![\p{L}\p{N}])` + escaped phrase + `(?![\p{L}\p{N}])`, flags `iu`. Inner whitespace in the topic matches any run of whitespace.
    - It returns the first sentence holding the match, split on `. ! ?` or a newline and trimmed to 200 characters around the match. `start` and `end` are offsets within `sentence`.
  - `type Suggestion = TopicRecord & { sentence: string; start: number; end: number }`
  - `mentionedNotTagged(topic: string, records: (TopicRecord & { texts: string[]; seeded: boolean })[], limit = 10): { shown: Suggestion[]; more: number }`. It skips seeded records and those whose `concepts` already hold the topic's key. Results are newest first.

- [ ] **Step 1: Write the failing tests:**
  - `scheduling` matches Dana's `4 hours a week on scheduling`.
  - `schedul` matches nothing (whole words only).
  - `Friday afternoon` matches across a line break in notes.
  - Regex characters in a topic (`c++`, `$300`) are escaped and match literally.
  - Accented text matches its own spelling (`café` matches `Café`).
  - Seeded and already-tagged records are skipped.
  - 12 matches give `shown.length === 10` and `more === 2`.
- [ ] **Steps 2–4:** See the tests fail, implement, see them pass.
- [ ] **Step 5:** Commit: `feat: find records that mention a topic without it`.

### Task 3.2: Suggestions on the topic page

**Files:**
- Modify: `web/src/commands/topics.ts` (`loadTopicRecords` also returns `texts` and `seeded`; `loadTopic` fills `suggestions`)
- Create: `web/src/components/topics/MentionRow.tsx` (server component that renders the sentence and marks the match with `<mark className="font-semibold underline">`, with no background-only meaning)
- Modify: `web/src/app/(workbook)/topics/[slug]/page.tsx`

**Copy (verbatim):**
- Heading `Mentioned, not tagged`, line `These mention “<name>” but don't have the topic.`, button `Add topic`, overflow `and <n> more`.
- Error under the row: `Couldn't add the topic: <reason>. Nothing was changed.`

- [ ] **Step 1:** Test: `loadTopic` for `scheduling` with only Dana tagged suggests the test, whose title contains "scheduling".
- [ ] **Step 2:** Add the section after the three record sections. Each row's **Add topic** is an `ActionButton` posting `addTopicAction` with the record path and the topic name.
- [ ] **Step 3:** Run `pnpm test && pnpm lint && pnpm exec tsc --noEmit`.
- [ ] **Step 4: Dry run:**
  - Tag only Dana `scheduling` and check that the test shows under Mentioned, not tagged with "scheduling" marked.
  - Press Add topic and check that it moves up into Tests.
  - Archive the test file in another window, press Add topic on a stale page, and check that the error row shows.
- [ ] **Step 5:** Commit: `feat: suggest records that mention a topic`.

---

## Feature 4: Find

### Task 4.1: Core, matching

**Files:**
- Create: `web/src/core/find.ts`
- Test: `web/src/core/find.test.ts`

**Interfaces:**
- Produces:
  - `type FindKind = "page" | "step" | "conversation" | "test" | "decision" | "topic"`
  - `type FindItem = { kind: FindKind; label: string; detail: string; href: string; date: string | null; words: string }`. `words` is the normalized text matched against: the label plus person, org and date for conversations.
  - `normalizeFind(text: string): string`, which applies NFKD, strips combining marks and lowercases.
  - `matchFind(items: FindItem[], query: string, limit = 8): FindItem[]`:
    - An empty query gives the pages, then the 5 most recent dated records.
    - Otherwise every query word must be a substring of `words`. Results are grouped in the order page, step, conversation, test, decision, topic, newest first within a group, and cut at `limit`.
  - `KIND_WORDS: Record<FindKind, string>`, the words shown on each row: "Page", "Step", "Conversation", "Test", "Decision", "Topic".

- [ ] **Step 1: Write the failing tests:**
  - `dana` finds the conversation, and `bright care` finds it by org.
  - `pilot paid` finds the test regardless of word order.
  - `cafe` finds `Café`.
  - An empty query gives pages first.
  - A limit of 8 is respected, and grouping order is stable.
- [ ] **Steps 2–4:** See the tests fail, implement, see them pass.
- [ ] **Step 5:** Commit: `feat: match records and pages by name`.

### Task 4.2: The index and its action

**Files:**
- Create: `web/src/commands/find.ts` (`loadFindIndex(): Promise<FindItem[]>`), `web/src/app/(workbook)/find-actions.ts` (`findIndexAction(): Promise<{ ok: true; items: FindItem[] } | { ok: false }>`)
- Test: `web/src/commands/find.test.ts`

The index:
- **Pages:** Home `/today`, People `/people`, Everything logged `/logged`, Decisions `/decisions` and Topics `/topics`.
- **Steps:** from `canvasBlocks()`, linking to `/path/<id>`.
- **Records:** conversations, tests and decisions, the same rows `loadTopicRecords` builds. Imported records are included, with detail `Imported`, so the founder can find them to confirm.
- **Topics:** from `topicIndex`.

Detail examples are `Conversation · 8 Oct` and `Test · Running`.

- [ ] Test that the fixture index holds Dana, the paid-pilot test, the decision, the customer step and the five pages. Then implement and commit: `feat: index of everything Find can open`.

### Task 4.3: The Find dialog

**Files:**
- Create: `web/src/components/workbook/FindDialog.tsx` (client)
- Modify:
  - `web/src/components/workbook/WorkbookNav.tsx` (a **Find** button with the shortcut shown in text, on both the mobile row and the side nav)
  - `web/src/components/claude/ClaudePanel.tsx` (add `data-claude-panel` to the `<aside>`)

**Behavior:**
- Ctrl+K, or ⌘K when `navigator.platform` reports a Mac, opens the dialog, unless `event.target.closest("[data-claude-panel]")` is set. It calls `preventDefault` only when it opens the dialog.
- On open it calls `findIndexAction()` once and matches on the client as the founder types. While the index loads, the input is usable and the list says `Loading…`.
- It uses `<dialog>` with `showModal()`. The input has `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`. The list is `role="listbox"` with `role="option"` rows, and each row reads `<label> · <kind words> · <detail>`.
- Up and down arrows move the selection, Enter opens it with `router.push`, Esc closes, and focus returns to the Find button.

**Copy (verbatim):**
- Input placeholder: `Find a conversation, test, decision or step`
- No match: `Nothing named “<query>”. Find searches names, not notes.`
- Error: `Couldn't read your records. Try again, or reload the page.`

- [ ] **Step 1:** Build the dialog and button.
- [ ] **Step 2:** Run `pnpm lint && pnpm exec tsc --noEmit`.
- [ ] **Step 3: Dry run:**
  - Ctrl+K opens the dialog, typing `dana` and pressing Enter opens her page, and focus behaves as specified.
  - With focus in the Claude panel's terminal, Ctrl+K reaches the terminal.
  - The no-match state keeps the query.
  - A keyboard-only pass works start to finish, and the screen reader announces the selected option.
- [ ] **Step 4:** Commit: `feat: Find any record or page from the nav`.

---

## Feature 5: Cited quotes

### Task 5.1: `cited` on the decision schema

**Files:**
- Modify: `web/src/store/schemas.ts` (`decisionSchema`)
- Test: `web/src/store/loop-schemas.test.ts`

**Interfaces:**
- Produces: `decisionSchema` output gains `cited: { path: string; text: string }[]`, defaulting to `[]`. Issues:
  - A citation whose `path` is in neither `evidence` nor `against` gives an issue at `cited.<i>.path`: `cite only conversations listed as evidence or against`.
  - The same `{ path, text }` twice gives an issue at `cited.<i>`: `that quote is cited twice`.
  - An empty `text` fails `min(1)`.

The field is allowed on an open decision. The founder may collect quotes before deciding.

- [ ] Write the failing tests:
  - The fixture decision plus `cited: [{ path: Dana, text: "I lose my whole Friday afternoon to the schedule." }]` parses.
  - A path outside the evidence lists, a duplicate and an empty text each give their issue.
  - Older records without `cited` still parse.

  Then implement, run `pnpm test src/store/loop-schemas.test.ts`, and commit: `feat: a decision can cite a conversation's exact words`.

### Task 5.2: Core, is a citation still true?

**Files:**
- Create: `web/src/core/citations.ts`
- Modify: `web/src/store/check.ts`
- Test: `web/src/core/citations.test.ts`, `web/src/store/check.test.ts`

**Interfaces:**
- Produces:
  - `citationState(cite: { path: string; text: string }, conversation: { quotes: string[]; numbers: string[] } | null): "ok" | "changed" | "missing"`. It compares exact strings after trimming. `missing` is left to the broken-link warning that already exists, since the path is also in evidence or against.
  - `citableLines(c: { type; seeded?; quotes; numbers }): string[]`. It returns quotes then numbers for a confirmed customer or prospect conversation, and `[]` otherwise.
- check-data warning for `changed`: `cited: the quote from <path> no longer matches. Cite it again from the decision.`

- [ ] Write the failing tests (ok, changed after rewording Dana's quote, advice conversation gives no citable lines, seeded gives none), implement, and commit: `feat: check-data flags a cited quote that changed`.

### Task 5.3: Cite from the forms

**Files:**
- Modify:
  - `web/src/commands/decisions.ts`:
    - `parseDecisionForm` reads `cite` checkbox values as `<path>::<text>`, splitting at the first `::`.
    - `createDecision` and `resolveDecision` write `cited`.
    - `loadDecisions`'s `evidenceOptions` gain `citable: string[]` from `citableLines`.
  - `web/src/components/decisions/DecisionForm.tsx`, `web/src/components/decisions/ResolveDecisionForm.tsx`, `web/src/app/(workbook)/decisions/actions.ts`
- Test: `web/src/commands/decisions.test.ts`

**Behavior:**
- Under the Evidence and Against checklists, a fieldset `Quotes to cite (optional)` lists, for each checked conversation with citable lines, its person and date, then one checkbox per line. A checked conversation with none shows `Nothing quoted in this conversation yet.` The fieldset is hidden when no conversation is checked.
- A citation whose conversation isn't checked in Evidence or Against is refused with `Pick quotes only from the conversations you chose above.` under the fieldset. Every value is kept.
- `resolveDecision` takes the same checklist, so an open decision can gain or lose citations when it's decided.

- [ ] **Step 1: Write the failing tests:**
  - A parsed form with Dana in evidence and her quote checked creates a decision with `cited` set.
  - Her quote checked without her in evidence gives the error and keeps `values`.
  - `resolveDecision` replaces `cited`.
- [ ] **Step 2:** Implement and run `pnpm test`.
- [ ] **Step 3:** Build the fieldset. It updates as checkboxes change, in client state, with no server round trip.
- [ ] **Step 4:** Run `pnpm lint && pnpm exec tsc --noEmit`, then commit: `feat: pick quotes to cite when recording a decision`.

### Task 5.4: Show cited quotes

**Files:**
- Modify:
  - `web/src/app/(workbook)/decisions/page.tsx` (decision card)
  - `web/src/core/references.ts` (`referencesTo` fills `quotes` with the decision's `cited` texts for the target)
  - `web/src/components/workbook/ReferencedBy.tsx`

**Copy (verbatim):**
- On the card, under its list, each cited quote is a `<blockquote>`, followed by `<person>, <short date>` linking to the conversation.
- When `citationState` is `changed`, the quote is followed by the text `No longer in the conversation`. It's spelled out as text, not color alone.
- In Referenced by on a conversation page, each quote shows under its decision's row.

- [ ] **Step 1:** Extend the references test: Dana's reference carries the cited quote.
- [ ] **Step 2:** Implement and run `pnpm test && pnpm lint && pnpm exec tsc --noEmit`.
- [ ] **Step 3: Dry run:**
  - Cite Dana's quote on a new decision and check that it appears on the card and under Referenced by on her page.
  - Reword her quote by hand and check that the card says `No longer in the conversation` and check-data warns.
- [ ] **Step 4:** Commit: `feat: show cited quotes on decisions and where they came from`.

### Task 5.5: Tell the agent

**Files:** `AGENTS.md`, `.claude/skills/synthesize/SKILL.md`

- [ ] **AGENTS.md:** add `cited [{path, text}] (a quote or number copied exactly from a conversation already in evidence or against)` to the decisions row of the file kinds table.
- [ ] **synthesize skill, step 7:** for each confirmed theme, add the quotes behind it to `cited`, copied exactly, with each path also listed in `evidence`, or in `against` for what contradicts. Keep the `alternatives` lines as they are.
- [ ] Run `pnpm -s check-data` against a synthesize dry run in a temp data folder, then commit: `docs: synthesis cites the quotes behind each theme`.

---

## Done when

Each feature, before its branch merges, passes `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit` and `pnpm -s check-data` against `test-data`. Its dry run is also done, with each state in its brief checked by hand: first run, empty, populated, error and success. Home and `pnpm -s today --json` give the same output before and after every feature.
