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
- Everything is created as a draft marked "Imported — confirm", tagged `chat import <date> #<import id>`. Pasting the same block again skips what it already created, so a retry after a failure never duplicates. Nothing is overwritten, and founder details fill only empty fields. Assumptions come back as links to set up a test, because a test needs success and failure criteria first.

## Weekly update (`founderive-week`)

```
outcome: <the outcome as it stands now>
kept: <commitment id>
done: <commitment id>
dropped: <commitment id> | <reason>
new: <what you're committing to> | <YYYY-MM-DD or nothing>
blocker: <one line>
help: <one line>
```

- Each open commitment gets one `kept`, `done` or `dropped` line. The preview lists any without one as "not reviewed".
- `kept` changes nothing. Leaving out `outcome` keeps the current one. Leaving out `blocker` or `help` clears it, because the weekly prompt asks about both every week.
- An unknown id, a `dropped` without a reason, an empty paste, or a line Founderive can't read blocks the whole update. Nothing is applied until it's fixed, and when it applies, every change is saved in one write.
- "none yet" and "none open" are Founderive's own placeholders and are never read as data.
