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
The pipeline work was initially left uncommitted for review; the user then
authorized committing it, all direct to `main` (ecosystem convention).

portfolio_site (6):
- `bff0a90` feat(deploy): onboard to evo-net with nginx static image
- `d4743c7` style: prettier baseline reformat (html/css/js)
- `fa7f3d1` build(hooks): add prettier pre-commit hook
- `92322f4` chore(codex): add native skill adapters and repository guidance
- `160b4ec` docs: session logs for app-intake pipeline shakedown
- `6dcd01c` docs(codex): record headless skill-activation verification

infra (1):
- `586ff27` docs(domains): register portfolio-site

docs (3):
- `394d584` docs(onboard): static-site nginx pattern + force-recreate gotcha
- `c437b45` docs(precommit-hook): portfolio_site rollout + LFS-hooks hazard
- `08cddd5` docs(app-intake): fold in portfolio_site shakedown (first full run)

The baseline reformat was kept in its own commit, separate from the hook, per
the precommit meta-prompt. Hooks committed at mode `100755` (verified via
`git ls-tree`) — not inert. Nothing pushed.

## Uncommitted work left behind
None from this session. `images/chunk-norris/` remains untracked — pre-existing,
present at session start, deliberately not staged. `/home/evan/.bashrc` was
edited (portfolio_site added to `_evo_services`) but is not version-controlled;
it needs a `source ~/.bashrc` to take effect.

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
  `git diff --check` clean.
- Codex skill activation, headless: `codex exec -s read-only -C <repo> '<the
  codex-setup.md activation test>'` (codex-cli 0.144.6, ChatGPT auth) → PASS.
  Both wrappers activated and cited
  `.claude/skills/adding-project-screenshots/SKILL.md` (both swiper reference
  points) and `.claude/skills/rebuild-restart/SKILL.md` (exact rebuild command);
  no files modified. Confirms the `../../../.claude/skills/` wrapper paths
  resolve. No feature flag gates skills in this CLI version.
- `/skills` TUI listing — **NOT run**; it is interactive-only with no `codex
  exec` equivalent. Still owed, though the activation test above is strictly
  stronger evidence.
- Commit-time hook proof: the reformat commit `d4743c7` triggered the real hook,
  which reported `All matched files use Prettier code style! ✓ ok`.

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
- Run `/skills` once in an interactive Codex session from the repo root to close
  the last verification gap (~30 seconds; activation is already proven).
- `source ~/.bashrc` so the evo-net auto-start picks up portfolio_site.
- Push the three repos when ready — nothing was pushed this session.
- Decide if/when to cut prod (`evanleon.com`) over to the containerized stack.

## Pointers
- Pipeline driver doc: `../docs/meta-prompts/app-intake/app-intake.md`
  ("Shakedown run (2026-07-23, portfolio_site)"); runlog + changelog rows dated
  2026-07-23.
- Per-step subagent logs: `docs/session-logs/2026-07-23-15-15-…-infra-onboarding.md`,
  `…-15-40-…-precommit-hook.md`, `…-15-57-…-prepare-codex.md`.
- Codex setup: `docs/codex-setup.md`.
