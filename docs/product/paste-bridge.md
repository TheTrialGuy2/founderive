# Paste-bridge formats

A chat in the browser can't write files, so Founderive gives it a prompt and reads one block of text back. There are two blocks.

## Import (`founderive-import`)

```
## Founder
name: …
venture: …
one-liner: …
industry: …
customer: …
problem: …
## Canvas: <block id or your own block title>
<the current belief, in the founder's words>
## Assumption
belief: …
risk: …
## Conversation
date: YYYY-MM-DD
person: <first name or role>
type: customer | prospect | mentor | partner | investor | other
notes: …
```

- Any subset of the Founder lines is fine. Canvas, Assumption and Conversation sections repeat.
- A conversation needs `type` and `person`; without `date`, its date is unknown.
- Canvas names match a block id or the founder's own block title, ignoring case.
- Every value is one line. A line Founderive can't read is shown as an error to fix, and nothing is created until it's fixed.
- Everything is created as a draft marked "Imported — confirm", tagged `chat import <date> #<import id>`. Pasting the same block again skips what it already created, so a retry after a failure never duplicates. Nothing is overwritten. The preview lists each proposed founder detail with a checkbox; only checked ones are written, and only into empty fields. A conversation `person` that looks like an email, a web address or a phone number is an error: use a first name or a role. Imported conversations don't count as evidence until the founder confirms them. Assumptions come back as links to set up a test, because a test needs success and failure criteria first.

## Weekly update (`founderive-week`)

```
outcome: <the outcome as it stands now>
kept: <commitment id>
done: <commitment id>
dropped: <commitment id> | <reason>
new: <what you're committing to> | <YYYY-MM-DD or nothing>
blocker: <one line, or none>
help: <one line, or none>
```

- Each open commitment gets one `kept`, `done` or `dropped` line. The preview lists any without one as "not reviewed", and that blocks the update: the chat's answer was probably cut off. `kept` and `done` take only an id; anything after a bar is an error.
- `kept` changes nothing. Leaving out `outcome` keeps the current one. `blocker: none` or `help: none` (also nothing, n/a or no, in any case) clears that field; leaving the line out keeps the current value.
- An unknown id, a `dropped` without a reason, an empty paste, or a line Founderive can't read blocks the whole update. Nothing is applied until it's fixed, and when it applies, every change is saved in one write.
- "none yet" and "none open" are Founderive's own placeholders and are never read as data.
- Each update is applied once. Its id (a hash of the block's lines) is recorded in the check-in as `appliedUpdates`, so pasting it again, or pressing Apply twice, changes nothing. New commitments get ids from that id and their line's order.
- The update applies to the current week only. A page left open from last week is refused: reload and paste again.
- Only the first block is read. Text after it, or a second block, is noted in the preview.
