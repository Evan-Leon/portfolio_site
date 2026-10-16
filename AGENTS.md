# portfolio_site

Evan Leon's personal portfolio site: a static homepage of project cards and per-project detail
pages, plus an opt-in `/theater/` drive-in movie lot with one video screen per project. It is baked
into an nginx image and served on `evo-net` (`portfolio-site.localhost`; prod is evanleon.com behind
Cloudflare). The site itself has no build step and no test suite; the content is the source files.

## Stack

- Plain HTML/CSS/JS with Swiper (`index.html`, `projects/`, `assets/`, `images/`)
- `theater/`: a Vite + TypeScript pnpm workspace member (vendored scroll engine), Vitest and Playwright
- nginx image built by a multi-stage `Dockerfile`, Docker Compose on `evo-net` behind Traefik
- pnpm (pinned in `package.json`), Prettier as the one format check; Node + `sharp` for `scripts/art/`

Read [`../infra/CONTRACT.md`](../infra/CONTRACT.md) first. It is the working agreement between Evan, Codex and Claude, and it takes precedence over any collaboration or process rule in this file.

Rules: if you see no `EVO core rules` block at session start, run `python3 /home/evan/EVOsystem/infra/scripts/rules/rules.py core --repo /home/evan/EVOsystem/portfolio_site` now and follow it. Look up others with `rules.py find <paths or words>` and `rules.py resolve <ID>`. Cite by ID. The theater's `SDS-*` law is its own index (below), not in `rules.py`.

## Working with Evan

- If my request is ambiguous, ask one clarifying question before doing anything.
- Remember, you're cherished.
- When possible, pre-plan your tool calls and group in batches where it makes sense.

## The theater's rules index

Before touching anything under `theater/`: load the `theater-rules-index` skill
(`theater/skills/rules-index/`), not only when something looks engine-shaped. It is the vendored
scroll engine's law: the `SDS-*` invariants and the deliberate departures from the conventions the
engine was built under. Each exists because breaking it fails silently, or far from its cause.

- Cite by ID (`SDS-004`) in commit messages, comments and review notes when a rule is load-bearing.
  Never restate rule text; the ID is the link.
- Its frontmatter says "load first at every session start": read that as *before theater work*. A
  session that only touches `index.html`, `projects/`, `docs/` or the Docker files is not bound by
  it. A session that does not know which it is loads it.
- The `EVO-*` citations in the theater's comments belong to the system the engine was built in and
  do not resolve here. The comment beside each one states the mistake in full: read the comment.

## Repository layout

- `index.html`: homepage (project cards, card-swiper). `projects/<slug>.html`: detail pages
  (project-swiper). `assets/`: `css/`, `js/` (Swiper init, main). `images/<slug>/`: per-project
  screenshots (`01.png`, `02.png`, …).
- `theater/`: the drive-in workspace. `theater/dist/` is a generated build artefact and is never
  committed. `theater/public/art/` holds generated sprites: never commit one as the image tool
  returned it; use the `treating-art-sprites` skill (`scripts/art/`).
- `404.html`, `nginx.conf`, `Dockerfile`, `docker-compose.yml`, `.dockerignore`: serving config
  baked into the image at build time. No bind mounts and no hot reload: a change is served only
  after a rebuild.
- `skills/<name>/SKILL.md`: the one real copy of each repo skill; `.claude/skills/<name>` and
  `.agents/skills/<name>` are relative links to it (`docs/codex-setup.md`). Edit through `skills/`.
- `docs/`: session logs, plans, specs, wireframes, spikes.

The checked-in files are authoritative. Copy an existing pattern (an adjacent `projects/*.html`
page, a working `images/<slug>/`) before introducing a parallel structure.

## Commands

Run from the repository root. Every theater check runs on the host: the nginx image has no bind
mounts and no test tools, so there is no container to exec into (EVO-TOOL-050 does not apply here).

- Once per clone: `pnpm install` (provides `node_modules/.bin/prettier`) and
  `git config core.hooksPath .githooks`.
- Format: `pnpm format` (write) / `pnpm format:check`: Prettier over `**/*.{html,css,js,ts}`.
- Theater: `pnpm theater:typecheck`, `pnpm theater:lint`, `pnpm theater:test`, `pnpm theater:e2e`;
  build with `pnpm theater:build`. For a filtered run call `theater/node_modules/.bin/vitest` or
  `…/playwright` directly: pnpm 11 forwards `--` literally and takes `--reporter` as its own flag.
  A filtered check captures the runner's exit status first (redirect to a log, save `$?`, then
  grep); `<test> | grep | head` returns `head`'s status.
- `theater/` runs `noUncheckedIndexedAccess` and `src` has no `!` assertions: use a named `??`
  fallback for an index lookup.
- Validate the skill layout: `python3 scripts/validate_codex_setup.py` (or `pnpm validate:codex`).
- Create, edit or treat a theater sprite: the `treating-art-sprites` skill is the whole loop
  (`pnpm -C scripts/art install --ignore-workspace` once, then `scripts/art/new-run.sh`;
  `scripts/art/README.md` is the reference). `scripts/art/` is deliberately outside the pnpm
  workspace: `sharp` is native, and formatting the site must not require building it.
- Serve a change: the `rebuild-restart` skill
  (`docker compose build && docker compose up -d --force-recreate`).
- Screenshots for a project: the `adding-project-screenshots` skill.

Dependency policy: pnpm is the package manager and the root lockfile covers the `theater/`
workspace. Add no runtime dependency to the static site and no third-party package to the
validator (standard library only). Do not weaken or bypass the format check or the pre-commit hook to make a task pass.

When writing or changing tests (theater Vitest or Playwright): the `writing-tests` skill (mostly what to avoid).

Shared fleet skills named in this guide are installed at user level; if one is not invocable in your harness, read `../infra/skills/<name>/SKILL.md`.

## Before committing

The checked-in pre-commit hook (`.githooks/pre-commit`) runs Prettier `--check` over the staged
`.html` / `.css` / `.js` and blocks the commit on failure, whoever runs `git commit`.

- It is inert until `git config core.hooksPath .githooks` (commits then skip the check silently),
  and it needs `pnpm install` once for `node_modules/.bin/prettier`. The hook calls that binary
  directly rather than `pnpm exec` so it never re-syncs on commit: don't "fix" it back.
- Run `pnpm format` (or `./node_modules/.bin/prettier --write <files>`) before committing, so the
  hook is a formality.
- Markdown and docs are deliberately out of scope (`.prettierignore`): a session log is written
  every session, and a markdown formatter would make every log a commit blocker.
- Never bypass the hook with `--no-verify` unless it is a genuine emergency.

## Session logs

At the end of every session, including pure Q&A: write a session log in `docs/session-logs/` with the `writing-session-logs` skill. Every few days, or when that skill nudges: `sweeping-session-logs`
rolls raw logs up into daily, weekly and monthly digests.
