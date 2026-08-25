# portfolio_site — agent instructions

Static personal portfolio site (plain HTML/CSS/JS) baked into an nginx image and
served on the `evo-net` Docker network. There is no build step for the site
itself and no application test suite — the content *is* the source files.

## Repository layout & source of truth

- `index.html` — homepage (project cards + card-swiper).
- `projects/<slug>.html` — per-project detail pages (project-swiper).
- `assets/` — `css/`, `js/` (Swiper init, main).
- `images/<slug>/` — per-project screenshots (`01.png`, `02.png`, …).
- `theater/` — self-contained Vite + TypeScript drive-in theater workspace;
  `theater/dist/` is a generated build artefact and is never committed.
- `404.html`, `nginx.conf`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`
  — serving config baked into the image at build time (no bind mounts, no hot
  reload; a rebuild is required for any change to be served).
- `.claude/skills/<name>/SKILL.md` — **canonical** skill instructions (shared by
  Claude Code and Codex). These files are the single source of truth; the Codex
  wrappers under `.agents/skills/` only point at them.
- `docs/` — session logs, plans, specs. `docs/codex-setup.md` documents the
  Codex adapter setup.

The checked-in source files are authoritative. Inspect existing patterns (an
adjacent `projects/*.html` page, a working `images/<slug>/`) before introducing
a parallel structure.

## Setup & verification commands

Run from the repository root (`/home/evan/EVOsystem/portfolio_site`).

- Install dev deps (once per clone): `pnpm install` — provides
  `node_modules/.bin/prettier`.
- Enable the pre-commit hook (once per clone): `git config core.hooksPath .githooks`.
- Format: `pnpm format` (write) / `pnpm format:check` (check) — Prettier over
  `**/*.{html,css,js,ts}`.
- Theater checks: `pnpm theater:typecheck`, `pnpm theater:lint`, and
  `pnpm theater:test`; build with `pnpm theater:build`.
- Validate the Codex setup: `python3 scripts/validate_codex_setup.py`
  (or `pnpm validate:codex`).
- Serve a change (rebuild the image + recreate the container): use the
  `$rebuild-restart` skill —
  `docker compose build && docker compose up -d --force-recreate`.

Dependency policy: pnpm is the package manager (`packageManager` is pinned in
`package.json`) and the root lockfile covers the `theater/` workspace; do not add
runtime dependencies for the static site, and do not add third-party packages
to the Codex validator (standard library only). Do not weaken or bypass the
format check or the pre-commit hook to make a task pass.

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

## Codex Skills

Repository-specific Codex skills are thin wrappers under `.agents/skills/`. Each
points at its canonical body under `.claude/skills/<name>/SKILL.md` (the source
of truth). Use the appropriate skill explicitly for substantial work:

- `$adding-project-screenshots` — adding/updating/troubleshooting project
  screenshots: `images/<slug>/` files and the two swiper references
  (`index.html` card, `projects/<slug>.html` detail).
- `$rebuild-restart` — rebuild the nginx image and recreate the container after
  changing any served file, `Dockerfile`, `nginx.conf`, or `docker-compose.yml`.

The session-log skills (`writing-session-logs`, `sweeping-session-logs`) are
intentionally **not** exposed as Codex wrappers — see `docs/codex-setup.md` for
the rationale. Run `python3 scripts/validate_codex_setup.py` to validate this
setup.
