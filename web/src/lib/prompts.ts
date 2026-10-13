// Ready prompts for first-run states, in two families: an AI that can edit files on this computer, and a chat in the
// browser that can't (the founder pastes its answer back). The product owner's wording is kept verbatim here.
// Placeholders: {dataDir}, {venture}, {today}; the weekly prompt adds {outcome} and {commitments}. Filled on the server.

export const FILE_CHAT_BASE = `I'm building {venture} and I keep my founder record in Founderive, a folder of Markdown files at \`{dataDir}\`. Help me keep it current by asking me questions one at a time and writing my answers into the files. Here are the rules:

- **One file per entry.** Structured fields go in YAML frontmatter, and free writing goes below it.
  - \`founder.md\` is who I am and what I'm building.
  - \`checkins/YYYY-Www.md\` is my week. It must have \`week: YYYY-Www\` (ISO week, starting Monday), then:
    - \`outcome\`: one sentence
    - \`commitments\`: a list of \`{ id, text, due?, status: open | done | dropped, reason (required when dropped), link? }\`
    - \`blocker\`
    - \`helpNeeded\`
  - If I'm in a program, \`program/week-NN.md\` has \`week\` (a number), \`title\`, and that week's \`homework\`, with \`status: open | done | skipped\` and a \`skipReason\` when skipped.
- **Dates and fields.** Dates are real \`YYYY-MM-DD\` dates. Don't add a field that isn't listed here. Anything that doesn't fit a field goes in the body of the file, in my words.
- **Never delete a file.** Move it to \`_archive/\`.
- **Leave \`nextStepLog\` alone** unless I explicitly dismiss, defer or replace the recommended action and give you the reason. In that case, add one entry with \`via: agent\`.
- **You propose, I confirm.** Write what I said, not what you concluded.
- **Check your work.** After you write, run \`pnpm -s check-data\` from the app's \`web/\` folder if you can, and fix what it flags.`;

export const FILE_CHAT_ENDINGS = {
  default: `Start by reading \`founder.md\` and this week's check-in. Then tell me two things, one line each: what this week's outcome is (or ask me for one), and what my open commitments are. My recommended next action is on the app's Today page, or in \`pnpm -s today\` if you can run it; don't rank my work yourself. Then ask me one question.`,
  "no-outcome": `Start by reading \`founder.md\`. Then ask me the one thing I want to be true by the end of this week, and write it as this week's outcome. Create the check-in file if it doesn't exist, with \`week\` set.`,
  "no-commitments": `Start by reading this week's check-in. Then ask me what I'm committing to this week, one at a time, and write each one, with a due date if I give one.`,
  "empty-program-week": `Start by reading the current \`program/week-NN.md\`. Then ask me which homework items I've done and which I'm skipping and why, and update their status in the week file.`,
  "empty-canvas": `Start by reading \`founder.md\` and the files in \`canvas/\`. Then ask me about one canvas block at a time. Write my answer as that block's current text, and ask me whether it's untested, has some evidence, or is tested.`,
} as const;

export const PASTE_IMPORT = `I've been thinking out loud with you about my business. I keep my founder record in an app called Founderive, which reads one block of text in a fixed format. Please turn what I've told you in this conversation into exactly one block in the format below. Today is {today}.

What to include:
- Only things I said about my own business, as I last said them. Skip ideas I rejected, questions I asked, hypotheticals, and anything I pasted in from somewhere else. If you're not sure I said it, leave it out. Never add a number, a date, a name or a fact I didn't give you.
- Leave out any line you can't fill from my words, and any section with nothing in it. Never output a placeholder: no "…", no "YYYY-MM-DD", no "<block id>", no list of options.
- Under \`## Founder\`, fill only the lines I've actually given you.
- Use \`## Canvas: <block id>\` once per block, with one of these ids: customer, problem, solution, alternatives, advantage, channel, revenue, cost, feasibility. If I named my own canvas blocks in this conversation, you may use those names exactly as I wrote them. Under the heading, write my current belief about that block in my words, kept short. It's a belief, not a fact.
- Use \`## Assumption\` only for something I called an assumption, a bet or a guess, or said I haven't checked yet. \`risk\` is what I said breaks if it's wrong. Leave the \`risk\` line out if I didn't say.
- Use \`## Conversation\` only for a real person I said I talked to:
  - \`person\` is a first name or a role, never a full name or contact details.
  - \`date\` is a real calendar date as YYYY-MM-DD. Convert "yesterday" or "last Tuesday" using today's date. If I never said when, leave the \`date\` line out.
  - \`type\` is exactly one of: customer, prospect, mentor, partner, investor, other. If it's unclear, use other.
  - \`notes\` is what I said happened, in my words.
- Every value is one line. Don't use \`##\`, backticks or the bar character \`|\` inside a value; write "or" instead of a bar.

Format:

\`\`\`founderive-import
## Founder
name: …
venture: …
one-liner: …
industry: …
customer: …
problem: …
## Canvas: <block id>
<my current belief, in my words>
## Assumption
belief: …
risk: …
## Conversation
date: YYYY-MM-DD
person: …
type: customer | prospect | mentor | partner | investor | other
notes: …
\`\`\`

Repeat \`## Canvas: …\`, \`## Assumption\` and \`## Conversation\` as many times as needed, one per item. Output the block and nothing else: no text before it, no text after it, and nothing inside the fence except the lines above.`;

export const PASTE_WEEK = `Help me update my week in Founderive. Today is {today}.

This week's outcome: {outcome}
Open commitments:
{commitments}

Ask me one question at a time and wait for my answer before the next. If a step has a follow-up, ask it as its own question. Go in this order:
1. The outcome. If it says "none yet", ask me for the one thing I want to be true by the end of this week. Otherwise ask whether it still stands or has changed.
2. Each open commitment, one at a time: is it done, still going, or dropped (I've decided not to do it this week)? If dropped, ask me why. Take my reason as given.
3. Is there anything new I'm committing to this week? If yes, ask for a date as a real calendar date. If I don't have one, that's fine.
4. Is anything blocking the outcome?
5. Is there help I should be asking for? If yes, from whom? A first name or a role is enough.

Don't judge; a reason is enough. Keep my words, don't polish them.

When we're done, output exactly one block in this format and nothing else: no text before it, no text after it, and nothing inside the fence except these lines.

\`\`\`founderive-week
outcome: <my outcome as it stands now>
kept: <commitment id>
done: <commitment id>
dropped: <commitment id> | <my reason, in my words>
new: <what I'm committing to> | <due date as YYYY-MM-DD, or nothing after the bar>
blocker: <one line, or none>
help: <one line, or none>
\`\`\`

Rules for the block:
- One \`kept\`, \`done\` or \`dropped\` line for every commitment in the list above, using only those ids, so every one is accounted for.
- A \`dropped\` line always has my reason after the bar.
- One \`new\` line per new commitment.
- Always include \`blocker\` and \`help\`. Write \`none\` if there's nothing. Leave out \`new\` if there's nothing new.
- Every value on one line. Write "or" instead of a bar character inside a value.
- Never output a placeholder.
- If I decided not to set an outcome, leave the \`outcome\` line out, and the app keeps what it has.`;


export type FileChatEnding = keyof typeof FILE_CHAT_ENDINGS;

// Pointers to the repo skills (Task 13) for screens the supplied prompts don't cover. Written for this plan.
export const SKILL_PROMPTS = {
  conversations: "Here are my notes from a conversation: <paste your notes or a transcript>. Log it in my Founderive data folder at {dataDir}, following .claude/skills/log-conversation/SKILL.md in the Founderive repo.",
  tests: "Help me turn my riskiest assumption about {venture} into a venture test in my Founderive data folder at {dataDir}, following .claude/skills/new-test/SKILL.md in the Founderive repo.",
  decisions: "I decided <what you decided>. Log it in my Founderive data folder at {dataDir} under decisions/, with what I believed before, the evidence, the alternatives I considered, why, and whether it's easy to undo. Run pnpm -s check-data from the repo's web/ folder when you're done.",
} as const;

/** App fills for the weekly prompt. The week parser never reads them as data. */
export const NONE_YET = "none yet";
export const NONE_OPEN = "none open";

/** Replaces each {name} that has a value in `vars`; other braces (like "{ id, text }") are left as they are. */
export function fillPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (whole, name: string) => (name in vars ? vars[name] : whole));
}

export function fileChatPrompt(ending: FileChatEnding, vars: Record<string, string>): string {
  return fillPrompt(`${FILE_CHAT_BASE}\n\n${FILE_CHAT_ENDINGS[ending]}`, vars);
}

export function importPrompt(vars: Record<string, string>): string {
  return fillPrompt(PASTE_IMPORT, vars);
}

export function weekPrompt(vars: Record<string, string>): string {
  return fillPrompt(PASTE_WEEK, vars);
}

type WeekCheckin = { outcome?: string | null; commitments: { id: string; text: string; due?: string | null; status: "open" | "done" | "dropped" }[] } | null;

/** {outcome} and {commitments} for the weekly prompt: one line per open commitment, `id: text (due date or "no due date")`. */
export function weekPromptVars(checkin: WeekCheckin): { outcome: string; commitments: string } {
  const open = (checkin?.commitments ?? []).filter((c) => c.status === "open");
  return {
    outcome: checkin?.outcome || NONE_YET,
    commitments: open.length ? open.map((c) => `${c.id}: ${c.text} (${c.due ?? "no due date"})`).join("\n") : NONE_OPEN,
  };
}

export type PromptFamily = "fileChat" | "pasteBridge";

/** The family a prompt box opens on: the preferred one when it's offered, else the first offered. */
export function defaultFamily(offered: PromptFamily[], preferred?: PromptFamily): PromptFamily | undefined {
  return preferred && offered.includes(preferred) ? preferred : offered[0];
}
