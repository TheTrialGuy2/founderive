# founderive

A founder's workbook and record that runs on your own computer. Log your program homework, canvas, pitch versions, conversations and progress in plain Markdown files, and see it all organized in one app. Claude Code or Codex can read and update the same files when you talk to them.

## Start

You need [Node.js 24 or newer](https://nodejs.org) and git.
If you're on Node 25 or newer and pnpm isn't installed, run `npm install -g pnpm` first.

```bash
git clone https://github.com/TheTrialGuy2/founderive.git
cd founderive
node start.mjs
```

Your browser opens to a short setup (about five minutes). After that, Founderive opens on Today. Run `node start.mjs` again whenever you want to use it.

Using Claude Code or Codex? Open the folder and say "set me up". It will run the same command.

Your data lives in `founder-data/`. It is ignored by this repo's git, so pulling Founderive updates never touches it.

## Keep your data somewhere else (optional)

By default your data lives in `founder-data/` inside this repo. To keep it somewhere else instead — for example so it can have its own git history, or live in a synced folder — copy `founderive.local.example.json` to `founderive.local.json` at the repo root and set `dataDir` to the folder you want:

```bash
cp founderive.local.example.json founderive.local.json
```

```json
{
  "dataDir": "~/Founderive/MyVenture"
}
```

`founderive.local.json` is gitignored, so this choice stays local to your computer. `node start.mjs` prints where your data lives each time it starts.

## Useful commands (from `web/`)

| Command | What it does |
|---|---|
| `pnpm init-data` | Optional: creates `../founder-data` by hand. Setup in the app creates founder-data for you. |
| `pnpm check-data` | Checks every file in founder-data and lists anything to fix |
| `pnpm test` | Runs the unit tests |

## Found a bug or want to suggest a fix?

In the app, choose **Send feedback** in the menu. It saves a copy in your data folder under `feedback/`, then shows exactly what will be sent with a link to email it to hello@founderive.com (the page and app version are filled in). Nothing from your records is sent unless you paste it.

Comfortable with GitHub? [Open an issue](https://github.com/TheTrialGuy2/founderive/issues/new) or send a pull request. Issues are public.

## Demo

`/demo` holds the original clickable wireframe, with fictional data, for program teams.

## License

MIT. See `LICENSE`, and see `ATTRIBUTION.md` for adapted third-party material.
