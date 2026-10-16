# Founderive against "Customer Discovery as a Founder Evidence System"

An audit of the app as of 2026-10-16 against the report's evidence chain. The goal it's measured against: a user-friendly app that helps an early founder track and make sense of everything in their venture, interactions above all.

## The short version

The report and Founderive agree on the hard parts. Both say the founder decides, behavior beats opinion, a decision must cite its evidence, history is never overwritten, and AI drafts but never certifies. Founderive already does those well, and the report's warning list (AI laundering, post-hoc thresholds, repository isolation) is mostly covered.

The gap is in one place: **what happens between one conversation and a decision.** Founderive captures one conversation thoroughly and lands one interpretation on one step. It cannot say what five conversations add up to, whether any of them contradict a belief, whether they came from five companies or one, or what happened after a decision was made. That is the report's "transcript graveyard" and "confirmation discovery", and it's where sense-making lives.

The report describes a team SaaS with recordings, taxonomies and matrices. Founderive is a solo founder's Markdown folder with one main action. The audit filters the report through that: every proposal below is an optional field or a derived view, never a new required form, and the "don't adopt" list at the end is as deliberate as the gap list.

## The evidence chain, link by link

The report's backbone: theory → assumption → question → interaction → source → observation → pattern → decision → action → outcome. For each link: what Founderive has, the gap, and a rating. **Strong** means the link holds as well as the report asks. **Partial** means the data is there but a view or a field is missing. **Missing** means nothing in the app does this.

### Opportunity theory: Partial

- **Has:** `founder.md` holds problem, one-liner, target customer, stage, business model, evidence level and a 30-day outcome. The canvas blocks (customer, problem, solution, alternatives, advantage, channel, revenue, cost, feasibility) are the belief set, each with a prompt in plain words.
- **Gap:** The report wants the theory to name who uses, who pays, who blocks, the trigger, and why now. The Customer prompt asks "who has the problem most sharply", so user and buyer collapse into one answer. Nothing asks "why now".
- **Low priority.** A founder with their own `canvas/blocks.md` can already add these as blocks. The shipped Customer and Revenue prompts could each add one clause ("Who pays, and is that the same person?").

### Assumptions: Partial

- **Has:** Each canvas block is a belief with `status` (untested, some-evidence, tested), an append-only `history` of earlier wording, `done` with a reason, and imported or agent-edited markers that the founder reviews. Tests carry `belief` and `risk`. The hypothesis-engine skill scores candidates and the founder picks. All of this matches "update, don't certify" and "preserve time".
- **Gap:** A block has no falsifier, the report's "what would change your mind". `tested` doesn't say which way it went; a contradicted belief and a supported one look the same on the path. There is no supports / contradicts split anywhere (see Pattern, below). Prioritization lives only in the agent skill, so the app can't show why one step is riskier than another, which the report accepts as long as the founder can override with a reason.
- **Proposal:** Carry the test's result up to its block as words on the step chip ("Tested · contradicted"), which the step page already half-does ("Tested · supported"). Add an optional `falsifier` to a block, filled from the block form or the hypothesis-engine skill. No matrix.

### Research question and learning sprint: Strong

- **Has:** One weekly outcome, commitments with due dates and links to records, a talk goal, outreach by audience, a blocker and a help request. Tests precommit success and failure criteria, a due date, and are frozen once closed, so the threshold can't move after the result. A completed test must carry a decision and may name a next commitment.
- **Gap:** A week isn't tied to a decision. The report's sprint "pursues one decision"; Founderive's pursues one outcome. Decisions have `decideBy`, and Home surfaces one that's due, so the pieces exist. Nothing forces a founder to connect a test to the decision it informs, except `relatedTest` on a decision.
- **Leave as is.** The outcome-first week is simpler and the links are available when the founder wants them.

### People: Partial, and the biggest structural gap

- **Has:** A conversation names a `person` (first name or role only), an `org`, a `segment`, and a `type` (customer, prospect, mentor, partner, investor, other). Customer and prospect count as evidence; the rest is advice and is shown separately. People lists them with a feedback filter and an imported queue.
- **Gap:** There is no person, only conversations. Two calls with Dana are two cards. The report's "one-account bias" is invisible: five conversations at one company count as five people who discussed a step, since the chip counts conversations and never distinct orgs. There is no stakeholder role (user, buyer, approver, blocker, expert), so a founder can't see "I've heard from four users and no budget owner". There is no recruitment source, so a sample of friends and warm intros looks like a market. `segment` is free text, so it can't group.
- **Proposal, in order of value:**
  1. Count distinct `org` beside people on step chips and in synthesis ("5 people at 3 companies"). Derived, no schema change.
  2. Group People by person plus org, newest conversation first, with the count of conversations and open follow-ups. Derived.
  3. Optional `role` on a conversation: user, buyer, approver, influencer, blocker, expert. One select on the form, one line in the log-conversation skill. The step page can then say which roles are missing in words ("No one who pays yet").
  4. Optional `how` (how the founder reached them): warm intro, cold outreach, community, inbound, existing relationship. Shown, never scored.

### Interaction: Strong

- **Has:** The conversation record is the report's three layers, kept apart: raw notes in the body; atoms in `quotes` (verbatim only), `numbers`, `observedBehavior`, `alternatives`, `urgency`, `buyingProcess`; interpretation in `whatChanges`, which stays unconfirmed until the founder confirms it in the app. Observed versus reported is encoded by `observedBehavior` versus `quotes`. Capture is progressive: a quick form, a paste bridge for browser chats, the log-conversation skill for notes or transcripts, and a folder import that marks every draft "Imported — confirm". Follow-ups have due dates and surface on Home. Contact details are refused everywhere.
- **Gap:** No place for what the customer offered (an intro, data, a pilot, a deposit): `followUps` are the founder's promises. No objections. No label for whether a statement came before or after the founder pitched. The post-call debrief is one question, "what does this change", where the report asks eight (surprised, contradicted, repeated, missing, commitment, who next). No interview guide help, so a founder can log "would you pay for this?" as a question asked and nothing says it's a leading question.
- **Proposal:**
  1. Optional `theyOffered` list on a conversation (their next step: intro, data, trial, pilot, deposit, purchase). This is the report's commitment ladder in one field, and it's the only way "paid" can appear on a conversation rather than a test.
  2. Optional `objections` list. The follow-on "Objection Vault" idea needs it.
  3. Two debrief prompts, as optional lines in the body written by the log-conversation skill and offered on the "What this changes" card: "What surprised you?" and "Who should you talk to next?". Body text, not fields.
  4. A `prep-interview` skill: the founder names the step and the person, the agent drafts ten past-behavior questions in Founderive's words and flags any leading, future-tense or pitch question in the founder's own draft. No UI.

### Source: Strong for a local app

- **Has:** Every imported or agent-drafted record carries `seeded` and `source` (the document path or the chat it came from) until the founder confirms it. Agent edits to confirmed records keep `previous` for review. Notes stay in the body in the founder's words.
- **Gap:** Provenance is per record, not per excerpt. No recording or transcription.
- **Leave as is.** Record-level provenance is honest for Markdown. Transcription could arrive later as a local skill that writes notes for the log-conversation skill to read, never as an app feature.

### Observation and evidence strength: Partial

- **Has:** The ladder exists as a principle ("paid beats behavior, behavior beats opinion") and as `evidenceStrength` on a test, rated by the founder. A conversation counts as evidence only when confirmed and when it records something. The step chip counts people, never a percentage.
- **Gap:** Every conversation looks the same on a list. A quote and a paid pilot are both "customer evidence". The report's "visible composition" (four said it, two showed it, one paid) isn't shown anywhere.
- **Proposal:** Derive a composition line on the step page from fields that already exist: said (quotes or notes), showed (`observedBehavior`), offered (`theyOffered`, once added). Three counts in words. No score.

### Pattern: Missing

- **Has:** `areas` tags a conversation to steps, and a step lists the people who discussed it with their latest confirmed change. Everything logged has search and a type filter.
- **Gap:** Nothing reads across conversations. No themes, no counts of how often something recurred, no quotes side by side, no segment grouping, no contradiction, no "heard once". This is the gap the synthesis brief (`synthesis-direction.md`) addresses with a skill and a decision record.
- **Add to that brief, from the report:** show distinct orgs with every theme count; a "contradicts" list beside "heard most often" so negative cases are first-class; and a note that a cluster from one company or one warm source is weaker, in words.

### Decision: Strong, with two holes

- **Has:** A decision has a title, date, open or decided status, a decide-by date, the belief before, evidence links, alternatives, the decision, why, and whether it's reversible. An open question becomes a decided one in the same file. A test's `result` (what the evidence showed) is split from its `decision` (what the founder chose), and stop is a valid decision. Imported decisions wait for confirmation.
- **Gap:** No contradicting evidence: `evidence` is one list. No revisit trigger. No "what level does this challenge" (a feature, the solution, the segment, the problem, the theory), which the report calls the question that separates real pivots from cosmetic ones.
- **Proposal:** Optional `against` list of record paths beside `evidence`, shown as "Supports · 3 / Against · 1" on the card. Optional `challenges` on a decision: feature, solution, segment, problem or theory, one select. And see Outcome.

### Action: Strong

- **Has:** Commitments link to records and steps, carry over between weeks with their week named, and are done or dropped with a reason. A test's next commitment lands in the check-in. Follow-ups are due items.
- **Gap:** None that matters.

### Outcome: Missing

- **Has:** The weekly review asks what happened to the week's outcome. Nothing asks what happened after a decision.
- **Gap:** The report's "close the loop": a decision isn't finished until its outcome is recorded, and without that a founder can never learn whether they over-trust interviews or under-weight switching cost. This is the cheapest high-value hole in the app.
- **Proposal:** Optional `revisitOn` date on a decided decision. When it passes, Home lists "What happened after: <decision title>?" as a due item of kind `revisit`, and the decision page gains a short "What happened" form that writes `## Outcome` in the body with the date. One field, one due kind, one form.

## Cross-cutting principles

| Report principle | Founderive today | Verdict |
|---|---|---|
| Founder decides, AI drafts | Agent never sets `result`, `decision`, `whatChangesConfirmed`, `done`; never confirms imports; edits to confirmed records are reviewable | Strong |
| Preserve time, never overwrite | Block history, archive instead of delete, dated files, `agentEdit.previous` | Strong |
| Evidence before confidence, no score | Counts in words, no percentage, no validation badge, goals never shown as shortfall | Strong |
| Provenance everywhere | `seeded` + `source`, record paths as links, check-data on every write | Strong at record level |
| One main action, explained | `homeAction()` ranks and gives a reason; `pnpm today` says the same | Strong |
| Learning debt visible | Imports waiting, changes waiting, agent edits waiting, overdue items, files to fix, all on Home | Strong |
| Progressive capture | Quick form, paste bridge, skill, folder import | Strong |
| Contradictions by default | Nothing marks evidence as against a belief | Missing |
| Segment before aggregating | `segment` is free text, no grouping | Missing |
| Account independence | `org` exists, never counted | Missing |
| Stakeholder coverage | No role on a conversation | Missing |
| Close the loop on decisions | No revisit, no outcome | Missing |
| Saturation, not quotas | Weekly talk goal, "talk to five people" step, goal counts; never shown as shortfall | Partial, acceptable |
| Privacy | Local files, contact details refused, private `_reference/` | Strong for one founder |

## The report's failure modes, checked

| Failure mode | Covered? | By |
|---|---|---|
| Transcript graveyard | Half | Changes waiting on Home. Synthesis is the other half. |
| Confirmation discovery | No | Needs supports / against on conversations and decisions. |
| Interview-count theater | Mostly | Goals are counts, never shortfalls; synthesis adds "heard once". |
| Feature voting | N/A | The app records no requests. |
| Signal flattening | Half | Strength on tests only; conversations all look alike. |
| Segment soup | No | Free-text segment, no grouping. |
| One-account bias | No | Distinct orgs never counted. |
| Post-hoc thresholds | Yes | Criteria precommitted, closed tests frozen. |
| Permanent validation | Weak | No stale flag; blocks carry `updated`. |
| AI certainty laundering | Yes | `seeded`, `source`, `agentEdit`, agent guardrails. |
| Endless testing | Yes | Test `due`, decision `decideBy`, overdue on Home. |
| Premature incrementalism | Partly | Hypothesis-engine scores how badly each assumption hurts if wrong; nothing in the UI. |
| Repository isolation | Yes | Every record links; commitments carry links. |

## What to build, in order

Ranked by how much sense-making each unlocks per field added. Each is a direction brief on its own.

1. **Synthesis** (briefed). Add distinct-org counts, a contradicts list and the one-source warning.
2. **Supports or challenges.** When the founder confirms "what this changes", one extra choice: supports, challenges, or neither, for the belief it touches. Step page shows "4 support · 1 challenges". Decisions get `against`. This is the report's contradiction lane in the smallest possible form.
3. **Close the loop.** `revisitOn` on decisions, a `revisit` due item on Home, an Outcome form.
4. **Who they are.** Distinct orgs on chips, People grouped by person and org, optional `role` and `how` on a conversation, missing roles named in words on the Customer step.
5. **What they offered.** `theyOffered` and `objections` on a conversation; a said / showed / offered line on the step.
6. **Debrief and prep.** Two optional debrief lines in log-conversation; a `prep-interview` skill.
7. **Falsifier and result on the block.** `falsifier` on a block; "Tested · contradicted" on the chip.

Items 2 through 5 are each one or two optional fields plus a derived line. None adds a required step to logging a conversation.

## What not to adopt

The report is explicit that these are for later or never, and they'd cost Founderive its simplicity:

- Composite scores, risk matrices, heatmaps, saturation curves. Counts in words do the job at a founder's sample sizes.
- A controlled tag taxonomy. `concepts` exists on every record for a founder who wants tags; the app shouldn't manage a vocabulary.
- A person or account file kind. Group by `person` and `org`; don't make founders maintain contacts.
- Evidence atoms as records. Quotes, numbers and behavior as lists on the conversation are the atoms.
- Themes as records. A synthesis is a decision with the themes in `alternatives`; promote it only if founders keep asking for a themes page.
- Consent flows, recording, transcription, calendar and CRM integrations. Local notes, one founder.
- Event sourcing. Dated files, history lists and an archive folder already reconstruct the past.
- Team roles and sharing. Not this product's job yet.
