# Evidence-to-change direction brief

## Conversation review

### Who it is for

A founder who has just logged or confirmed a customer conversation and needs to interpret it while the evidence is fresh.

### User goal

Connect what the person said or did to a belief, feature, workflow, or next move that should change—or explicitly record that nothing changes yet.

### Primary next action

**Confirm what changed**

### Secondary actions

- Review the underlying quotes, behavior, numbers, and notes.
- Return to the path step after interpreting a conversation logged from that step.
- Edit conversation details, link a test, or add a follow-up.

### States

- **First run:** After a new conversation is saved, its page opens with “What does this change?” as the primary action.
- **Empty:** The prompt explains that “nothing yet” is a valid answer; the founder can leave it unresolved and return later.
- **Filtered-empty:** Not applicable because this is one conversation, not a filtered collection.
- **Populated:** A draft interpretation remains visibly unconfirmed until the founder confirms it.
- **Error:** The form keeps the founder’s words and explains what must be fixed.
- **Success:** The confirmed change is shown as the conversation’s conclusion, with a route back to the originating step when one exists.

## Home: changes waiting

### Who it is for

A founder returning to Home with confirmed customer evidence that has not yet been interpreted.

### User goal

Notice unfinished learning and turn the oldest waiting conversation into a clear change or an explicit “nothing yet.”

### Primary next action

**Decide what this changes** when no higher-priority risk, outcome, blocker, overdue item, or imported conversation is waiting.

### Secondary actions

- Open the oldest waiting conversation.
- Continue higher-priority work while the waiting count remains visible.

### States

- **First run:** No card appears until a confirmed customer conversation contains evidence.
- **Empty:** No card appears when every eligible conversation has a confirmed interpretation.
- **Filtered-empty:** Not applicable because Home has no filter for this queue.
- **Populated:** The card shows the number waiting, names the oldest conversation, and links to its interpretation.
- **Error:** Unreadable records remain in the existing Files to fix section and never enter this queue.
- **Success:** Confirming the interpretation removes that conversation from the count and advances to the next one.

## Step: latest change

### Who it is for

A founder reviewing the current answer for a path step.

### User goal

See the newest founder-confirmed interpretation that shaped the step, next to the answer it informs.

### Primary next action

The step’s existing contextual action remains primary.

### Secondary actions

- Open the conversation behind the latest change.
- Edit the step answer when the evidence changes the founder’s belief.

### States

- **First run:** No latest-change panel appears before any relevant interpretation is confirmed.
- **Empty:** The current answer stands alone when no confirmed change exists.
- **Filtered-empty:** Not applicable because the panel is derived from all conversations linked to the step.
- **Populated:** The newest confirmed change appears directly beneath the current answer with its person and date.
- **Error:** An unreadable conversation is excluded and remains available through Files to fix.
- **Success:** A newly confirmed interpretation becomes the latest change without altering the step answer automatically.
