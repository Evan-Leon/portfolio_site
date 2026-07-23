---
date: 2026-07-23
agent: claude-code
type: phase-execution
phases: []
repos: [portfolio_site, docs, infra]
---

## Accomplished
Drove the **app-intake pipeline shakedown** — the first-ever full traversal of
`docs/meta-prompts/app-intake/app-intake.md` — against portfolio_site, acting as
the pipeline driver (each step run as its own subagent for fresh context,
sequentially because they share one working tree). Outcome per step:

- **Step 1 onboard — done.** portfolio_site now runs on evo-net behind Traefik
  at `portfolio-site.localhost` via a new nginx static image (multi-page
  `try_files` + real `404.html`), prod-ready dual-router compose with a ghcr
  image field, **no droplet cutover / no CI-deploy** (per decision). bashrc
  `_evo_services`, `infra/domain-registry.md`, and a `rebuild-restart` skill
  added. Verified by curl (/, project deep link, css/js/img assets, 404).
- **Step 2 precommit — done.** Prettier `--check` pre-commit hook over staged
  html/css/js; markdown excluded (`.prettierignore`) so session logs never
  block commits. pnpm `package.json` introduced. 13 files baseline-reformatted
  (JS proven value-identical via acorn AST; HTML/CSS proven content-safe). Hook
  proven to run + fail from a plain `env -i` shell. Subagent caught that this is
  the fleet's only git-LFS repo and folded LFS's 4 lifecycle hooks into
  `.githooks/`.
- **Step 3 session-logs — already done** (skills adopted in commit afac...);
  reconciled the stale app-intake cell.
- **Step 4 rules-index — deliberate `—` opt-out** (user choice; static site,
  no project-law to index).
- **Step 5 logging — N/A** (static site, no backend).
- **Step 6 prepare-codex — done.** `.agents/skills/` wrappers for
  `adding-project-screenshots` + `rebuild-restart` (pointed at the repo's real
  `.claude/skills/` location, not a phantom top-level `skills/`); session-log
  stubs excluded with reason; stdlib `scripts/validate_codex_setup.py` (PASS)
  wired to `pnpm validate:codex`; `docs/codex-setup.md` written.

Driver bookkeeping in the `docs` repo: filled portfolio_site's status row
(1/2/3/6 ✅, 4 `— (opt-out)`, 5 `N/A`), added the runlog entry, folded the
pipeline-level shakedown findings into app-intake.md (new "Shakedown run"
section; intro no longer "untested"; folded-in criteria now count a deliberate
`—`), and added the changelog receipt.

Attempted-but-not-done: nothing — every planned step landed.

## Commits
None. (portfolio_site does not authorize agent commits; the whole pipeline's
work was left uncommitted for the user to review as one coherent set.)

## Uncommitted work left behind
Large working tree in portfolio_site from all five steps: `Dockerfile`,
`nginx.conf`, `docker-compose.yml`, `.env`/`.env.example`, `package.json`,
`pnpm-lock.yaml`, `.prettierignore`, `.githooks/*`, `.agents/skills/*`,
`scripts/validate_codex_setup.py`, `docs/codex-setup.md`, 3 subagent session
logs + this one, 13 reformatted site files, and edits to `.dockerignore` /
`.gitignore` / `AGENTS.md` / `CLAUDE.md`. Deleted `Dockerfile.prod`. Left
uncommitted intentionally; whoever commits must split the baseline reformat from
the hook and re-run `git add --chmod=+x .githooks/*` after the split reset.
Also modified in sibling repos: `infra/domain-registry.md`, `/home/evan/.bashrc`,
and several `docs/meta-prompts/**` bookkeeping files. `images/chunk-norris/`
remains untracked — pre-existing, not from this session.

## Verification
- Step 1: `docker compose build && up -d --force-recreate`; curl at
  `portfolio-site.localhost` — /, `/projects/classic-golf.html`,
  `/assets/css/styles.css`, both JS, `/images/favicon.png` all 200; bad path →
  `404.html`; both Traefik routers registered. PASS.
- Step 2: `env -i PATH=/usr/bin:/bin … bash .githooks/pre-commit` → exit 0;
  bad-input probe → exit 1; hide-binary arm → loud "run pnpm install", exit 1;
  `probe-git-hooks.sh portfolio_site` → exit 0; nginx site still serves after
  the change. PASS.
- Step 6: `python3 scripts/validate_codex_setup.py` → PASS (2 wrappers, exit 0);
  `git diff --check` clean. `/skills` discovery in a live Codex session — NOT
  run (needs a manual fresh Codex session; documented in codex-setup.md).

## Blockers
None.

## Open flags
- Prod (`evanleon.com`) still runs uncontainerized from the droplet root; the
  compose is prod-ready but a cutover (CI/deploy + onboard-droplet) is a
  deliberately deferred future decision.
- Codex `/skills` discovery is verified only structurally; interactive
  confirmation in a fresh Codex session is still owed.
- Step-4 rules-index is an opt-out, not a scaffold — revisit if the site ever
  grows project-law worth indexing.

## Rules-index candidates
None. (Repo deliberately has no rules-index.)

## Meta-prompt / skill / doc updates
- `app-intake.md` was the doc under test and, as the shakedown, its directions
  held up. Applied edits (folded-in criteria now count a deliberate `—`; new
  "Shakedown run" section; intro de-"untested") are outcomes, logged above — not
  proposals.
- `onboard-project.md` is backend/Django-shaped; a static-site/nginx app has to
  reinterpret much of it. The Step-1 subagent added a 2026-07-23 changelog entry
  there (static nginx pattern, the `--force-recreate` stale-image gotcha). No
  further edit proposed — the reinterpretation was manageable.
- `precommit-hook-meta-prompt.md`: the Step-2 subagent added `§P` (LFS lifecycle
  hooks disabled by `core.hooksPath`) to Section A + rollout log — a real
  silent-failure class the prompt lacked.
- `prepare-codex.md` assumes canonical skills at top-level `skills/`; apps on the
  shared session-log model keep them at `.claude/skills/` with infra stubs.
  Worth a note in prepare-codex's own changelog that the wrapper path + the
  "canonical resolves within this repo" model must adapt to `.claude/skills/`.

## Next steps
- User: review the combined working tree and commit (baseline reformat and hook
  as separate commits; re-run `git add --chmod=+x .githooks/*` after the split).
- Run the `/skills` discovery + read-only activation test in a fresh Codex
  session from the repo root (per `docs/codex-setup.md`).
- Decide if/when to cut prod over to the containerized stack.

## Pointers
- Pipeline driver doc: `../docs/meta-prompts/app-intake/app-intake.md`
  ("Shakedown run (2026-07-23, portfolio_site)"); runlog + changelog rows dated
  2026-07-23.
- Per-step subagent logs: `docs/session-logs/2026-07-23-15-15-…-infra-onboarding.md`,
  `…-15-40-…-precommit-hook.md`, `…-15-57-…-prepare-codex.md`.
- Codex setup: `docs/codex-setup.md`.
