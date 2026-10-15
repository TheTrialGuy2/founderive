# Pagination direction

## Who it is for

Founders whose record has grown beyond a screenful and who need to find, review or confirm work without losing their place.

## User goal

Move through long record lists in small, predictable pages while keeping the current filter and knowing how much of the list remains.

## Primary next action

The screen's existing primary action stays primary. Pagination is navigation, never a competing action.

## Secondary actions

- Go to the previous, next or a numbered page.
- Change or clear a filter; doing so starts again on page 1.
- On imported People, confirm only the conversations visible on the current page.

## States

- **First run:** Keep each screen's existing teaching empty state and prompt.
- **Empty:** Keep the existing cleared or category-specific empty message.
- **Filtered empty:** Keep the active filter and offer to clear it; no pagination is shown.
- **Populated:** Show at most 10 records per list, a “Showing X–Y of Z” summary, page numbers, and Previous/Next links. Preserve filters in pagination links.
- **Error:** Keep the screen's existing error or flagged-file treatment; pagination never hides flagged files.
- **Success:** After a write or confirmation refresh, clamp to the last page that still exists so the founder does not land on an artificial empty page.

## Where it applies

- People
- Everything logged
- Conversations (customer evidence and advice independently)
- Decisions
- Completed tests
- People who discussed a path step

Active work queues, the path itself, weekly commitments, flagged files and earlier answer versions remain unpaginated.
