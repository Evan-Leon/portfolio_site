# portfolio_site — agent instructions

## The theater's rules index

`theater/skills/rules-index/` is this project's law for the vendored scroll
engine: ten `SDS-*` invariants and the deliberate departures from the
conventions the engine was built under. Each one exists because breaking it
produces a failure that is silent, or that surfaces far from its cause.

- **Load it before touching anything under `theater/`** — not only when
  something looks engine-shaped. The rules it states are exactly the ones you
  would not think to ask about.
- **Cite by ID** (`SDS-004`) in commit messages, comments and review notes when
  a rule is load-bearing. Never restate rule text; the ID is the link.
- Its own frontmatter says "load first at every session start". Read that as
  *before theater work*: the index governs the engine, and a session that only
  touches `index.html`, `projects/`, `docs/` or the Docker files is not bound
  by it. A session that has no idea which it is should load it.
- The `EVO-*` citations scattered through the theater's comments belong to the
  system the engine was built in and do not resolve here. The comment beside
  each one always states the mistake in full — read the comment, not the ID.

## Session logs

Every session ends by writing a session log to `docs/session-logs/` — no
exceptions, including pure Q&A sessions. Invoke the `writing-session-logs`
skill for the filename convention and template (it's a stub pointing at the
shared EVOsystem copy in `../infra/skills/`). Every few days — or when the
skill nudges — run `sweeping-session-logs` to roll raw logs up into
daily/weekly/monthly digests.

## Before committing

A checked-in git pre-commit hook (`.githooks/pre-commit`) runs the same format
check CI would, scoped to what you staged: **Prettier `--check` over staged
`.html` / `.css` / `.js`**. It blocks the commit on failure and is tool-agnostic
(fires for every `git commit`, whoever runs it).

- **Install once per clone** (the hook is inert until you do — commits silently
  skip the check with no error): `git config core.hooksPath .githooks`
- **First clone also needs the dev dep** the hook checks against: `pnpm install`
  (creates `node_modules/.bin/prettier`; the hook resolves that binary directly
  rather than `pnpm exec`, so it never re-syncs on commit — don't "fix" it back).
- **Before committing**, run the formatter so the hook is a formality:
  `pnpm format` (or `./node_modules/.bin/prettier --write <files>`).
- **Markdown/docs are deliberately out of scope** (see `.prettierignore`): a
  session log is written every session, so a markdown-governing formatter would
  turn every log into a commit blocker. Code only.
- Never bypass with `--no-verify` unless it's a genuine emergency.
