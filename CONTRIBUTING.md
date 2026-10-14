# Contributing to Founderive

Thanks for helping. Anyone can suggest a change; the maintainer reviews and merges every one. Nothing reaches `main` without that approval.

## Ways to help

- **Report a problem or an idea.** [Open an issue](https://github.com/TheTrialGuy2/founderive/issues/new). Say what you did, what you expected, and what happened. Issues are public: never paste your own founder records, names of the people you talked to, or anything private.
- **Propose a change.** Send a pull request, as below.

## Proposing a change (pull request)

1. **Fork** the repo on GitHub (the **Fork** button, top right). This makes your own copy.
2. **Clone your fork** and make a branch:

   ```bash
   git clone https://github.com/<your-username>/founderive.git
   cd founderive
   git checkout -b my-change
   ```

3. **Make your change.** Run Founderive with `node start.mjs` to try it.
4. **Check it** from the `web/` folder. All three must pass:

   ```bash
   cd web
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm test
   ```

5. **Commit and push** to your fork:

   ```bash
   git add -A
   git commit -m "One sentence saying what changes for the founder"
   git push -u origin my-change
   ```

6. **Open a pull request** on GitHub from your branch into `TheTrialGuy2/founderive` `main`. Say what it changes and how you checked it. The maintainer reviews it, may ask for changes, and merges it when it's ready.

## Ground rules

- **Never commit founder data.** `founder-data/`, `founderive.local.json` and anything personal stay out of the repo. Tests use the fictional sample data in `web/test-data/` (Sam Rivera, Lantern).
- **Keep it program-agnostic.** Founderive works for any early-stage founder, in a program or not. Don't ship one program's wording, session names or homework; programs live in each founder's own data.
- **The founder decides.** The app and assistants draft and suggest; the founder confirms interpretations, results and decisions.
- **Follow the screen rules** in [AGENTS.md](AGENTS.md) ("Building a screen"): one primary action per screen, plain words, meaning never by color alone.
- **Only `web/src/store/` reads or writes founder data.**
- **Add or update tests** for any rule or command you change.

## License

By contributing, you agree your contribution is licensed under the [MIT License](LICENSE).
