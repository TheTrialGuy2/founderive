# founderive

A founder's workbook and record that runs on your own computer. Log your program homework, canvas, pitch versions, conversations and progress in plain Markdown files, and see it all organized in one app. Claude Code or Codex can read and update the same files when you talk to them.

## Requirements

- Node 24+
- pnpm, via `corepack enable`
- git

## Start

```bash
git clone https://github.com/TheTrialGuy2/founderive.git
cd founderive/web
pnpm install
pnpm init-data   # creates ../founder-data (your private record, with its own git history)
pnpm dev         # open http://localhost:3000
```

Then open `founder-data/founder.md` and fill in your name, venture and programStart (YYYY-MM-DD).

Your data lives in `founder-data/`. It is ignored by this repo's git, so pulling Founderive updates never touches it.

## Useful commands (from `web/`)

| Command | What it does |
|---|---|
| `pnpm check-data` | Checks every file in founder-data and lists anything to fix |
| `pnpm test` | Runs the unit tests |

## Demo

`/demo` holds the original clickable wireframe, with fictional data, for program teams.

## License

MIT. See `LICENSE`, and see `ATTRIBUTION.md` for adapted third-party material.
