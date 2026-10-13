# founderive

A founder's workbook and record that runs on your own computer. Log your program homework, canvas, pitch versions, conversations and progress in plain Markdown files, and see it all organized in one app. Claude Code or Codex can read and update the same files when you talk to them.

## Start

You need [Node.js 24 or newer](https://nodejs.org) and git.

```bash
git clone https://github.com/TheTrialGuy2/founderive.git
cd founderive
node start.mjs
```

Your browser opens to a short setup (about five minutes). After that, Founderive opens on Today. Run `node start.mjs` again whenever you want to use it.

Using Claude Code or Codex? Open the folder and say "set me up". It will run the same command.

Your data lives in `founder-data/`. It is ignored by this repo's git, so pulling Founderive updates never touches it.

## Useful commands (from `web/`)

| Command | What it does |
|---|---|
| `pnpm init-data` | Optional: creates `../founder-data` by hand. Setup in the app creates founder-data for you. |
| `pnpm check-data` | Checks every file in founder-data and lists anything to fix |
| `pnpm test` | Runs the unit tests |

## Demo

`/demo` holds the original clickable wireframe, with fictional data, for program teams.

## License

MIT. See `LICENSE`, and see `ATTRIBUTION.md` for adapted third-party material.
