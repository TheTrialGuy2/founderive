# Founderive

A workbook for early-stage founders that runs on your own computer.

Founderive helps you work out what you believe about your business, test it with real customers, and decide what to do next. Each day it shows you one next step, with the reason for it.

Everything you write is kept as plain Markdown files in a folder you own. The app shows them in one place. Claude Code or Codex can read and update the same files while you talk to them, and the app updates as they write.

It works for any kind of early business: a service, a local shop, a physical product, software, a nonprofit. You can use it on your own or alongside a founder program.

## What's in it

- **Home.** This week's outcome, how many people you've talked to against your weekly goal, your outreach, what's due, and your path, with one main action.
- **Your path.** You, then each part of your business in order (customer, problem, alternatives, solution and the rest). Each step holds your answer, the people who discussed it, and one next move: plan a conversation, or log one.
- **People.** Everyone you've talked to, with the conversations that gave real feedback first.
- **Tests and decisions.** When talk isn't enough, a small test with success and failure criteria set in advance. Decisions keep the reasoning. Find them all under Everything logged.
- **Import.** Bring in a folder of your existing documents as drafts for you to confirm.

The loop behind it is **assumption → test → evidence → learning → decision → next commitment**. See [docs/product/operating-loop.md](docs/product/operating-loop.md).

## You decide

An assistant can draft, summarize and suggest. You confirm the parts that are judgments: what a conversation changes, a test's result, and a decision. Anything drafted from your documents or a chat is marked "Imported — confirm" until you confirm it.

## Start

You need [Node.js 24 or newer](https://nodejs.org) and git.
If you're on Node 25 or newer and pnpm isn't installed, run `npm install -g pnpm` first.

```bash
git clone https://github.com/TheTrialGuy2/founderive.git
cd founderive
node start.mjs
```

Your browser opens to a short setup that takes about five minutes. After that, Founderive opens on Today. Run `node start.mjs` again whenever you want to use it.

Using Claude Code or Codex? Open the folder and say "set me up". It runs the same command, then asks what you want to be true by the end of the week. The instructions it follows are in [AGENTS.md](AGENTS.md).

Using ChatGPT or Claude in a browser? Founderive gives you a prompt to copy into the chat, then reads back the answer you paste in. See [docs/product/paste-bridge.md](docs/product/paste-bridge.md).

## Your data

Your data lives in `founder-data/`, as one Markdown file per entry. This repo's git ignores that folder, so pulling Founderive updates never touches it. You can give it its own git history if you want one.

To keep your data somewhere else, such as a synced folder, copy `founderive.local.example.json` to `founderive.local.json` at the repo root and set `dataDir`:

```bash
cp founderive.local.example.json founderive.local.json
```

```json
{
  "dataDir": "~/Founderive/MyVenture"
}
```

`founderive.local.json` is gitignored too. `node start.mjs` prints where your data lives each time it starts.

Founderive doesn't send your records anywhere. It runs only on your computer, at `127.0.0.1`.

## Useful commands (from `web/`)

| Command | What it does |
|---|---|
| `pnpm today` | Prints Today in the terminal: this week's outcome, the next step and its reason, and what's open (`--json` for assistants) |
| `pnpm check-data` | Checks every file in your data folder and lists anything to fix |
| `pnpm data-dir` | Prints where your data folder is |
| `pnpm init-data` | Creates an empty data folder by hand. Setup in the app does this for you. |
| `pnpm test` | Runs the tests |

## Status

Founderive is an early beta. The core loop works: setup, Today, the canvas, conversations, venture tests and decisions. The weekly review and a shareable progress summary are next.

## Feedback

In the app, choose **Send feedback** in the menu. It saves a copy in your data folder under `feedback/`, then shows exactly what will be sent, with a link to email it to hello@founderive.com. Nothing from your records is sent unless you paste it in yourself.

Comfortable with GitHub? [Open an issue](https://github.com/TheTrialGuy2/founderive/issues/new) or send a pull request. Issues are public.

## Demo

`/demo` holds an early clickable mockup, with fictional data, of how a founder program might use Founderive. It's separate from the workbook and doesn't read your data.

## License

MIT. See [LICENSE](LICENSE). Adapted third-party material is credited in [ATTRIBUTION.md](ATTRIBUTION.md).
