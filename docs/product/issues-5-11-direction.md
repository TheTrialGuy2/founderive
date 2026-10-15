# Issues 5–11 direction brief

## Home

- **Who it is for:** a founder deciding what to do next today.
- **Goal:** see the current outcome, goal counts, outreach, decisions and due work without turning Home into a dashboard of competing prompts.
- **Primary action:** unchanged; it comes only from `homeAction()` and keeps its existing verb-plus-object label.
- **Secondary actions:** edit customer outreach, open a due decision, and inspect non-customer outreach.
- **First run:** setup remains the entry point.
- **Empty:** absent goals or audience rows add no placeholder; no due work keeps the existing cleared message.
- **Filtered empty:** not applicable on Home.
- **Populated:** nested goals sit under the 30-day outcome; customer outreach is visible first; other audiences are disclosed; open decisions due within seven days appear once in Due.
- **Error:** invalid records remain in Files to fix and do not suppress otherwise readable work.
- **Success:** saved outreach updates in place; a decided question disappears from Due.

## Decisions

- **Who it is for:** a founder carrying both unresolved questions and completed calls.
- **Goal:** park a question with a decide-by date, then resolve it in the same record.
- **Primary action:** `Save decision` while resolving an open question; otherwise `Record the decision` in the create form.
- **Secondary actions:** inspect evidence and related tests.
- **First run / empty:** explain that the section holds open questions and decided calls, then show the create form.
- **Filtered empty:** no filters are introduced.
- **Populated:** open questions are named as open and show their decide-by date; decided records retain the current detail.
- **Error:** keep entered values, identify invalid fields, and keep flagged files visible.
- **Success:** the card changes from Open to Decided without creating a second file.

## Program

- **Who it is for:** a founder participating in an optional multi-week program.
- **Goal:** accurately record sessions that happened and review imported session material.
- **Primary action:** on an unrecorded week, `Mark session held`; on an imported week, `Confirm this week`.
- **Secondary actions:** move between program weeks and inspect exercises or homework.
- **First run:** no program keeps the section out of navigation and explains setup if reached directly.
- **Empty:** a held week with no material says `Session held on <date>; nothing recorded`.
- **Filtered empty:** no filters are introduced.
- **Populated:** the list uses the calendar-derived current week and labels imported weeks as needing confirmation.
- **Error:** a broken week stays listed with what failed and how to fix the file.
- **Success:** marking held records the date and done status; confirming clears only `seeded`.

## Agent edit review

- **Who it is for:** a founder whose agent changed an already-confirmed canvas block or conversation.
- **Goal:** understand the change and keep or revert it without treating the record as a new import.
- **Primary action:** `Keep edit`.
- **Secondary action:** `Revert edit`.
- **First run / empty:** no review panel appears when there is no `agentEdit`.
- **Filtered empty:** not applicable.
- **Populated:** show the agent summary and previous/current wording together; the record remains confirmed.
- **Error:** preserve the pending edit and show the write error without changing either version.
- **Success:** Keep clears the review marker; Revert restores the previous wording, preserves the agent wording in history, and clears the marker.
