# Founderive

A workbook for early-stage founders that runs on your own computer.

Founderive helps you work out what you believe about your business, test it with real customers, and decide what to do next. Each day it shows you one next step, with the reason for it.

Everything you write is kept as plain Markdown files in a folder you own. The app shows them in one place. Claude Code or Codex can read and update the same files while you talk to them, and the app updates as they write.

It works for any kind of early business: a service, a local shop, a physical product, software, a nonprofit. You can use it on your own or alongside a founder program.

## What's in it

- **Home.** This week's outcome, how many people you've talked to against your weekly goal, your outreach, what's due, and your path, with one main action.
- **Your path.** You, then each part of your business in order (customer, problem, alternatives, solution and the rest). Each step holds your answer and who discussed it; the Customer step is where you plan and log conversations.
- **People.** Everyone you've talked to, with the conversations that gave real feedback first. Log and plan conversations here, and tick which steps each one informs.
- **Tests and decisions.** When talk isn't enough, a small test with success and failure criteria set in advance. Decisions keep the reasoning. Find them all under Everything logged.
- **Import.** Bring in a folder of your existing documents as drafts for you to confirm.

The loop behind it is **assumption → test → evidence → learning → decision → next commitment**. See [docs/product/operating-loop.md](docs/product/operating-loop.md).

## You decide

An assistant can draft, summarize and suggest. You confirm the parts that are judgments: what a conversation changes, a test's result, and a decision. Anything drafted from your documents or a chat is marked "Imported — confirm" until you confirm it.

## Install and start (step by step)

These steps are for a Mac. Founderive also runs on Windows and Linux, but the Claude panel is Mac-only for now.

### 1. Install Node.js

Go to [nodejs.org](https://nodejs.org), download the installer for **version 24 or newer** (the "LTS" button is fine if it says 24 or higher), and click through it.

### 2. Make sure git is installed

Open **Terminal** (press Cmd+Space, type `Terminal`, press Enter) and type:

```bash
git --version
```

If it prints a version, you're set. If your Mac offers to install developer tools, click **Install** and wait for it to finish, then type the command again.

### 3. Download Founderive and start it

In Terminal, copy and paste these three lines, pressing Enter after each:

```bash
git clone https://github.com/TheTrialGuy2/founderive.git
cd founderive
node start.mjs
```

The first start takes a minute or two while it sets up what it needs (including `pnpm`, if you don't have it). When it's ready, Terminal says **"Founderive is running at http://127.0.0.1:3000"** and your browser opens.

### 4. Set up your workbook

The browser opens to a short setup (about five minutes): your name, your venture, your website and logo (both optional), your stage, who your customer is and what problem you solve, what you want to be true in 30 days, and whether you're in a founder program. Then Founderive opens on **Home**.

### Every day after that

Open Terminal and type:

```bash
cd founderive
node start.mjs
```

Keep that Terminal window open while you use Founderive. To stop it, click into the Terminal window and press **Ctrl+C**.

### Getting updates

```bash
cd founderive
git pull
node start.mjs
```

Updating never touches your data (see [Your data](#your-data)).

## Using it with Claude Code or Codex (optional)

Founderive works on its own. If you use [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) or Codex, they can read and update the same files while you talk to them, and Home updates as they write.

**Install Claude Code** by following [Anthropic's setup guide](https://docs.claude.com/en/docs/claude-code/setup). You sign in with your own Anthropic account; Founderive never sees it.

Then use it in one of two ways:

- **Let Claude set you up.** In Terminal:

  ```bash
  cd founderive
  claude
  ```

  and say **"set me up"**. Claude starts Founderive for you, then asks what you want to be true by the end of the week. The instructions it follows are in [AGENTS.md](AGENTS.md).

- **Use the Claude panel inside Founderive.** Start Founderive with `node start.mjs`, click **Open Claude** in the corner of any workbook page, then **Start Claude** (or **Start Codex**). The first time, Claude asks you to sign in, right in the panel.
  - Inside the terminal every key goes to Claude. Press **F6** (fn+F6 on most Mac laptops) to leave the terminal.
  - Escape closes the panel when focus is outside the terminal, or anywhere in the panel when nothing is running.
  - On a step page, **Ask Claude about this step** types a starter line for you to send. If Claude isn't running yet, the panel keeps the line until you start Claude and type it in.

**Using ChatGPT or Claude in a browser instead?** Founderive gives you a prompt to copy into the chat, then reads back the answer you paste in. See [docs/product/paste-bridge.md](docs/product/paste-bridge.md).

## If something goes wrong

| What you see | What to do |
|---|---|
| `command not found: node` | Node.js isn't installed (or Terminal was open before you installed it). Install it, then close and reopen Terminal. |
| `Founderive needs Node 24 or newer` | Install the newer version from [nodejs.org](https://nodejs.org), then reopen Terminal. |
| `Installing dependencies failed` | Check your internet connection and run `node start.mjs` again. If it keeps failing, delete the `web/node_modules` folder and try once more. |
| Port 3000 is already in use | Nothing to do: Founderive picks another free port and prints the address. |
| The Claude panel says it can't start | In Terminal: `cd founderive/web` then `pnpm pty-check`. It says what's wrong. The rest of Founderive works without the panel. |
| The panel says Claude Code isn't installed | Install it from [Anthropic's setup guide](https://docs.claude.com/en/docs/claude-code/setup), then reload the page. |
| `esbuild … installed for another platform` | Your Terminal is running Intel (Rosetta) tools on an Apple Silicon Mac. Delete the `web/node_modules` folder, then run `arch -arm64 node start.mjs`. |
| Anything else | Choose **Send feedback** in the app, or [open an issue](https://github.com/TheTrialGuy2/founderive/issues/new). |

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
| `pnpm today` | Prints Home in the terminal: the main action and why, people talked to this week, where you are on the path, and what's due (`--json` for assistants) |
| `pnpm check-data` | Checks every file in your data folder and lists anything to fix |
| `pnpm data-dir` | Prints where your data folder is |
| `pnpm init-data` | Creates an empty data folder by hand. Setup in the app does this for you. |
| `pnpm test` | Runs the tests |

## Status

Founderive is an early beta. The core loop works: setup, Home, your path, people, tests, decisions and the Claude panel. The weekly review and a shareable progress summary are next.

## Feedback

In the app, choose **Send feedback** in the menu. It saves a copy in your data folder under `feedback/`, then shows exactly what will be sent, with a link to email it to hello@founderive.com. Nothing from your records is sent unless you paste it in yourself.

Comfortable with GitHub? [Open an issue](https://github.com/TheTrialGuy2/founderive/issues/new). Issues are public, so never paste your own records into one.

## Contributing

Suggestions and fixes are welcome. Everyone can propose a change; only the maintainer merges. See [CONTRIBUTING.md](CONTRIBUTING.md) for how.

## License

MIT. See [LICENSE](LICENSE). Adapted third-party material is credited in [ATTRIBUTION.md](ATTRIBUTION.md).
