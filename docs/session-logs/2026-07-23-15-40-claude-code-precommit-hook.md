---
date: 2026-07-23
agent: claude-code
type: tooling
phases: []
repos: [portfolio_site, docs]
---

## Accomplished
Rolled out the EVOsystem local pre-commit hook (app-intake pipeline Step 2) for
portfolio_site. A zero-tooling static site, so per the pre-made user decision I
adopted **Prettier (pnpm)** as the sole check.

Done:
- `package.json` (private, `format`/`format:check` scripts, `prettier@^3.6.2` →
  3.9.6, `packageManager: pnpm@11.15.1`) + `pnpm install` → `pnpm-lock.yaml` +
  `node_modules`.
- `.prettierignore` excluding `*.md` + `docs/` (reason baked in: a session log
  every session would otherwise make markdown a standing commit blocker).
- `.githooks/pre-commit` — single-root, scoped by file type
  (`grep -E '\.(html|css|js)$'` on staged), guards the prettier binary directly,
  no pnpm wrapper arm, fnm node-restore block. Mode `100755`.
- Baseline: `prettier --write` reformatted all 13 html/css/js files; re-check
  clean.
- **git-LFS lifecycle hooks** (`post-checkout`/`post-commit`/`post-merge`/
  `pre-push`) copied verbatim into `.githooks/` so `core.hooksPath` doesn't
  silently disable LFS.
- `.dockerignore` extended (node_modules + tooling) so nothing bakes into the
  nginx `COPY .` webroot; image rebuilt, site re-verified serving.
- `AGENTS.md` + `CLAUDE.md` gained a "Before committing" section.
- Meta-prompt bookkeeping in the docs repo (Section A hazard rewrite, changelog
  receipt, rollout-log §P, runlog line, Coverage tick).

## Commits
None. portfolio_site does not authorize agent commits — everything left staged/
unstaged. The docs-repo bookkeeping edits are also uncommitted (not my repo to
commit here).

## Uncommitted work left behind
- portfolio_site: 5 hooks staged (`100755`); baseline reformats of 10 html + 1
  css + 2 js unstaged; `package.json`, `pnpm-lock.yaml`, `.prettierignore`
  untracked; `AGENTS.md`/`CLAUDE.md`/`.dockerignore` modified. Whoever commits
  should split the baseline reformat from the hook and re-run
  `git add --chmod=+x .githooks/*` after any reset (a reset discards the staged
  mode). Pre-existing infra-onboarding changes (`.gitignore`, `Dockerfile*`,
  `docker-compose.yml`, `nginx.conf`, `.env.example`, `rebuild-restart` skill,
  `images/chunk-norris/`) were already in the tree, untouched by me.
- docs: precommit-hook meta-prompt / changelog / rollout-log / runlog edits.

## Verification
- `prettier --check` before write: 13 files flagged; after write: "All matched
  files use Prettier code style!"
- String-value proof: 2 JS files AST-checked with acorn (0 string-value deltas);
  HTML/CSS whitespace-collapse diff → only doctype-case / void self-close /
  quote-normalization / rendering-safe tag-wrap, no content change. No
  whitespace-sensitive HTML contexts (`<pre>`/`<textarea>`/`white-space` grep
  empty).
- `probe-git-hooks.sh portfolio_site` → exit 0 (P1 runs under `env -i`, P2 arm
  1/1 ok, P4 scope ok, P3 `100755`).
- Manual `env -i` probes: POSITIVE (exit 0, block prints), PROVE-IT-CAN-FAIL
  (bad html → exit 1 + abort msg), HIDE-THE-BINARY arm (loud "run pnpm install",
  exit 1), SCOPING both ways with throwaway index (docs-only `.md` → no block,
  exit 0; single `.html` → block fires). No probe residue.
- nginx: `docker compose build && up -d --force-recreate`; webroot has no
  tooling; `/`, project pages, css, both js, favicon all 200; unknown path →
  styled 404.html; container Up.
- Fleet LFS back-check (by hand): no other ticked repo uses `filter=lfs`
  (`chud/backend` confirmed too), so the silent-LFS-disable rule needs no
  back-fix elsewhere. Full fleet probe skipped (the LFS rule is not tool-checked;
  ~6 min run adds nothing for it).

## Blockers
None.

## Open flags
- `pnpm install` is now a prerequisite for committing html/css/js in a fresh
  clone; documented in AGENTS.md/CLAUDE.md "Before committing".
- Splitting the baseline reformat into its own commit is deferred to whoever has
  commit authorization.

## Rules-index candidates
None. (portfolio_site has no rules-index.)

## Meta-prompt / skill / doc updates
Edits applied (so they are outcomes, listed above) to
`precommit-hook-meta-prompt.md`: Step 0's EXISTING HOOKS hazard was too narrow —
written about a `pre-commit`, but `core.hooksPath` disables EVERY `.git/hooks/`
hook and the common real case is git-LFS's four lifecycle hooks. Rewrote it +
folded §P. `rebuild-restart` and `writing-session-logs` skills were accurate and
sufficient as-is.

## Next steps
Pipeline driver updates the app-intake status table (I deliberately did not
touch it). Someone with commit rights commits the baseline + hook (two commits)
and re-applies `git add --chmod=+x .githooks/*` after the split reset.

## Pointers
- Meta-prompt rollout retrospective: `docs/meta-prompts/precommit-hook/precommit-hook-rollout-log.md` §P.
- Hook: `.githooks/pre-commit`.
