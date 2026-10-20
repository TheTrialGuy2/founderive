# Connected record direction brief

Founderive keeps the founder's record as one Markdown file per entry, the way Obsidian keeps a vault. What it borrows from Obsidian here is what makes a vault easy to use: you can see how notes relate. Today a founder can open any record, but can't see what points at it, can't follow a theme across the steps, can't jump to a record by name, and can only cite a whole conversation when one sentence in it carried the decision.

This brief adds five things, in build order:

1. **Referenced by.** Each record shows what cites it, worked out from links that already exist.
2. **Topics.** The `concepts` field every record already allows gets an editor and a page per topic.
3. **Mentioned, not tagged.** A topic page lists records that mention the topic in their text without carrying it, and the founder adds the topic in one click.
4. **Find.** One box that jumps to any record or page by name.
5. **Cited quotes.** A decision can cite the exact quote or number from a conversation, not only the whole conversation.

What it is not: a graph view, freeform folders, wikilinks in the body, custom queries, or a change to the rule that links between tests and conversations are kept on both sides. Each is out of scope below.

## The UI budget

- One new card, "Referenced by", on the conversation and test pages. On decision cards it's one line.
- One new field, **Topics**, on the conversation, test and decision forms, shown as links on those records.
- One new page, `/topics/[slug]`, plus a list at `/topics` reached from Everything logged. No new nav item.
- One button in the nav, **Find**, which opens a dialog. Ctrl+K (⌘K on a Mac) opens it too.
- One optional checklist on the decision form, "Quotes to cite", and the cited quotes shown on the decision card.

No change to Home and no new main action. Nothing here outranks `homeAction()`.

## Words

- In the app the field is **Topics**. It's stored as `concepts`, which every schema already allows. "Themes" is taken: synthesis uses it for the decision record it writes, and a topic isn't a confirmed pattern. It's just a label the founder chose.
- "Referenced by", "Mentioned, not tagged", "Find", "Quotes to cite".

## 1. Referenced by

### Who it is for

A founder on a conversation or test page who wants to know what it has already been used for before acting on it again.

### User goal

See every decision that cites this record, and which way it cut, without opening Decisions and scanning.

### Primary next action

None. The card only shows information, and its rows are links.

### What it shows

- **Conversation page:** decisions that list it under `evidence` ("Evidence for: <title>") or `against` ("Against: <title>"). Linked tests and commitments are already on this page, so they aren't repeated.
- **Test page:** decisions citing the test in `evidence`, `against` or `relatedTest` ("Decided from this test: <title>"). Linked conversations are already on this page.
- **Decision card:** decisions citing this decision in `evidence` or `against`, one line under the card's lists: "Cited by 2 decisions: <title>, <title>".
- Each row links to the citing decision at the right page of Decisions (`decisionHref`). An open decision says "open question" after its title. If a decision can't be read, its row is left out, and check-data already flags the file.
- Once cited quotes (5) exist, a decision that cites a quote from this conversation shows that quote under its row.

### States

- **No references:** the card doesn't render. There's no teaching text, since the page already has its own empty states.
- **Populated:** rows grouped by field, newest decision first.
- **Error:** reading decisions failed. The card says "Couldn't read your decisions, so references aren't shown. The rest of this page is up to date." and the page renders as usual.

## 2. Topics

### Who it is for

A founder whose conversations, tests and decisions keep returning to the same subject ("pricing", "onboarding", "the owner pays"), across more than one step.

### User goal

Label records with a short topic of their choosing, then see everything with that topic on one page.

### Primary next action

On a topic page: none. It's a reading view, and its rows are links. Adding a topic happens in a record's edit form, where saving is the form's existing primary action.

### Rules

- Topics are short text, 1 to 40 characters, with up to 8 per record. The founder types them, and matching ignores case and spacing: "Pricing" and "pricing " are the same topic. The page title uses the spelling seen most often, and the newest record breaks a tie.
- Topics belong to the founder. The agent writes topics only on records it drafts as imports (`seeded: true`), or when the founder says so in so many words. Changing topics on a confirmed record from chat follows the existing `agentEdit` rule (see the plan).
- Topics never feed Home, the path, evidence counts or the main action. They're for finding things.

### Screens

- **Forms:** the new-conversation, new-test and new-decision forms gain an optional **Topics** field. Topics are separated by commas, and the hint reads "Short labels you'll want to find later, like pricing or onboarding. Separate with commas."
- **Record pages:** topics show as links under the header (a conversation or test) or in the card's facts (a decision). A quiet "Edit topics" disclosure beside them holds the same field and a **Save topics** button. Tests and decisions have no general edit form, so this is how topics change after creation, and the conversation page uses it too so all three work the same way.
- **Closed tests take topics.** A topic is a label, not evidence, so it doesn't break the rule that a closed test is frozen. AGENTS.md says so explicitly.
- **Imported records don't.** The topics editor and Add topic (3) appear only once the founder has confirmed the record.
- **`/topics/[slug]`:** title is the topic; eyebrow "Topic". Sections: Conversations, Tests, Decisions, each newest first, each row as on Everything logged. Then section 3 below.
- **`/topics`:** every topic with its count, most used first. It's reached from a "Topics" link on Everything logged.

### States

- **First run (no topics anywhere):** `/topics` teaches: "Topics are short labels you add to conversations, tests and decisions, so you can find everything about one subject in one place." It shows a Claude prompt to copy: "Suggest a few topics for my conversations in Founderive, and ask me before adding any."
- **Unknown topic slug:** "No record has the topic “<slug>”. It may have been renamed." with a link to all topics.
- **Populated:** the sections above. Empty sections are hidden, not shown empty.
- **Filtered-empty:** not applicable, since there are no filters.
- **Error:** an unreadable record is left out and listed under "Files to fix", as Everything logged already does.
- **Success (after saving a form):** the record page shows the new topic links.

## 3. Mentioned, not tagged

### Who it is for

A founder on a topic page whose older records talk about the topic but were never tagged with it.

### User goal

Pull those records into the topic without opening each one.

### Primary next action

**Add topic**, a button on each suggested row. It acts on that one record. There's no "add to all": the founder looks at each one.

### Rules

- A record is suggested when it doesn't have the topic but its text contains the topic as a whole word or phrase, ignoring case. For a conversation, its text means notes, quotes, numbers, observed behavior, context, alternatives and what it changes; for a test, its title, belief, test text and body; for a decision, its title, decision, why, alternatives and body.
- Each row shows the matching sentence with the match marked by **bold weight and an underline**, not only by color.
- Imported records (`seeded: true`) are not suggested. They need confirming first. Closed tests are suggested, since a topic doesn't change their evidence.
- **Add topic** writes only `concepts` and goes through the same command as the form, which keeps topics the founder's: they press the button.
- Up to 10 suggestions show, newest first. If there are more, the list ends with "and 6 more".

### States

- **None:** the section doesn't render.
- **Populated:** heading "Mentioned, not tagged", one line of explanation ("These mention “pricing” but don't have the topic."), then the rows.
- **Success:** the row leaves the list and the record appears in its section above (the page re-renders).
- **Error:** the row stays and shows what happened: "Couldn't add the topic: <reason>. Nothing was changed." For example, the file changed or became unreadable since the page loaded.

## 4. Find

### Who it is for

A founder with dozens of records who knows the name they want: "Dana", "paid pilot", "pricing".

### User goal

Get to a record or page in a few keystrokes.

### Primary next action

Open the highlighted result. Enter or a click opens it.

### Rules

- **Find** is a button in the nav, labelled "Find" with the shortcut shown beside it ("Ctrl K" or "⌘K"). Ctrl+K or ⌘K opens it anywhere in the workbook, except while focus is inside the Claude panel, where the terminal owns the keyboard.
- It searches the names of: conversations (person, org, date), tests (title), decisions (title), steps (block titles), topics, and the workbook's pages (Home, People, Everything logged, Decisions, Topics). It matches names only, not full text. Full-text search is a later brief.
- Matching ignores case and accents and needs every typed word to match somewhere in the name. Results are grouped by kind; up to 8 show, records with the most recent date first.
- Each row says its kind in words ("Conversation · 8 Oct"), not by icon alone.
- The index is read when the dialog opens, so it's never stale.
- It's a native `<dialog>` with focus trapped. Esc closes it and focus returns to the Find button. Up and down arrows move the selection, and the result list is announced as a listbox.

### States

- **Opened, nothing typed:** the five pages, then the 5 most recent records.
- **No match:** "Nothing named “<query>”. Find searches names, not notes." The query stays.
- **Error:** "Couldn't read your records. Try again, or reload the page." The query stays.
- **Success:** the dialog closes and the page opens.

## 5. Cited quotes

### Who it is for

A founder recording a decision that one sentence a customer said, or one number they gave, actually carried.

### User goal

Keep that sentence with the decision, so the reason stays readable later and leads back to who said it.

### Primary next action

On the decision form, saving is still the primary action. "Quotes to cite" is an optional checklist inside it.

### Rules

- A decision gains `cited: [{ path, text }]`. `path` is a conversation already listed in the decision's `evidence` or `against`; `text` is one of that conversation's `quotes` or `numbers`, copied exactly.
- The text is copied rather than pointed at by position, so editing other quotes never breaks it. If the conversation's quote is later reworded, check-data warns: "cited: the quote from conversations/… no longer matches. Cite it again from the decision." The decision card still shows the cited text, marked "No longer in the conversation".
- Only confirmed customer and prospect conversations offer quotes to cite. Advice stays advice.
- The checklist appears under Evidence and Against once a conversation is chosen there. It lists that conversation's quotes and numbers, each with a checkbox.
- The decision card shows each cited quote as a block quote under the list it belongs to, with "Dana, 8 Oct" linking to the conversation.
- The synthesize skill writes `cited` for the quotes behind each theme, instead of only quoting them inside `alternatives`.
- An open decision can gain or lose citations when it's resolved: the resolve form shows the same checklist.

### States

- **No conversation chosen:** the checklist isn't shown.
- **A conversation with no quotes or numbers:** "Nothing quoted in this conversation yet."
- **Error:** "Pick quotes only from the conversations you chose above." is shown on save, and the form keeps everything entered.
- **Success:** the card shows the quotes. On the conversation's page, Referenced by (1) shows the quote under the decision's row.

## Out of scope

- **Graph view.** It looks good but doesn't help a founder decide anything.
- **Wikilinks in bodies.** Links stay in fields, where check-data can verify them.
- **Dropping the both-sides link rule.** Referenced by makes it possible to work out `relatedTests` from `relatedConversations` instead of storing both. That changes the data rules, so it's a separate decision.
- **Full-text search.** Find matches names only.
- **Suggesting links by step** (for example "an open test on the same step isn't linked"). It's worth doing, but it isn't a mention, so it's a separate brief.
- **Quote citations on tests.** Tests keep their evidence notes under `## Evidence`.
