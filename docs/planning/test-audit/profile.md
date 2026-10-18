# Test audit — profile of portfolio_site (STEP 1)

Date: 2026-10-18 (ET). Repo HEAD at profiling: `21b10bf` (main, clean). Run: fleet TF2 pass 1a,
collection only. `$L` = `/home/evan/.local/state/test-audit/portfolio_site`.

**Shape of the repo.** A static nginx site (plain HTML/CSS/JS, no build, no tests) plus `theater/`,
a Vite + TypeScript pnpm workspace member (the vendored scroll engine) with a Vitest suite and a
Playwright suite. There is **no pytest suite**: `HAS_BE=0`, and env.sh's backend values are
placeholders (`BE_REL=backend-absent`). `VENV_MODE=repo` because there is no backend venv to audit;
`PY=/usr/bin/python3` (stdlib, runs the audit tools).

## Q1 Suites

| suite | command (the guide) | count today | in scope |
|---|---|---|---|
| Vitest (`theater/src/**/*.test.ts`, jsdom) | `pnpm theater:test` (`vitest run` in `theater/`) | **438 tests in 25 files** | yes (`FE=$R/theater`) |
| Playwright (`theater/e2e/*.spec.ts`, chromium against `vite preview`) | `pnpm theater:e2e` | **61 tests in 10 files** | **excluded** (tools support pytest and vitest only) |
| nginx parity smoke (`theater/e2e/nginx-parity.sh`) | `bash theater/e2e/nginx-parity.sh` against the running container | 1 script (manual, needs the deployed image) | **excluded** (not a test runner) |
| pytest | none | 0 | n/a |

Evidence:

```
$ (cd $FE && pnpm exec vitest list --json > $L/vitest-list.json 2>$L/vitest-list.err); echo "list_exit=$?"
list_exit=0
438 vitest tests
"vitest": "^4.1.10"
coverage-v8 MISSING
$ (cd theater && ./node_modules/.bin/playwright test --list)   # list only; runs nothing
Total: 61 tests in 10 files
```

- `collect_exit`: not applicable (`HAS_BE=0`; `$L/collect.txt` is the valid empty input).
- `@vitest/coverage-v8` is missing. That is not a broken suite; STEP 5 adds it (as an Evan-approved
  devDependency, EVO-UNI-012, or out-of-tree).
- No test-database flag: the suite has no database (jsdom only), so there is no `--reuse-db` hazard.
- Vitest major is 4.x (same as chud's), so `list --json` and the junit reporter exist.
- Backend test layout (`git ls-files '*.py' | grep -E '(^|/)(tests?/|test_…)'`): **empty**. No Python
  tests anywhere in the repo.
- **Excluded suites** (carried to STEP 10's completeness line; scope ruling requested at STEP 4):
  - Playwright e2e: 61 tests in 10 files (`theater/e2e/`).
  - `theater/e2e/nginx-parity.sh`: one production-parity smoke script (curl checks against nginx).

## Q2 Nested repos

`git ls-files -s | awk '$1=="160000"'` prints nothing. No gitlinks: each phase uses one plain
worktree.

## Q3 Digest pins

```
$ grep -rlE 'sha256|hashlib|fingerprint|digest|manifest' … | grep -vE '…'
theater/src/adapters/placeholder.ts       # prose: "No `assets` manifest is attached"
theater/src/adapters/gsap-timeline.ts     # prose: "No `assets` manifest"
theater/src/lot/lot-scene.ts              # prose: "No `assets` manifest, deliberately"
theater/src/projects.ts                   # "no manifest to generate"; slug "showrunner-digest"
theater/src/engine/engine.ts              # prose: the adapter factory's asset manifest
theater/src/adapters/types.ts             # prose: the optional `assets` manifest
scripts/art/new-run.sh                    # sources a contract's manifest.sh (tool list), no hashing
$ grep -rlF 'portfolio_site' ../infra/meta-prompts/self-endpoint ../infra/scripts
../infra/scripts/context-audit/context_load.py      # repo name in a list
../infra/scripts/rules/tests/fixtures/malformed-rows-{pre,post}.md   # fixture text
../infra/scripts/sprites/measure/measure.py         # comment: a port of scripts/art/contracts/sprite/key.mjs
../infra/scripts/sprites/measure/README.md
$ find … -name evo_self_check.py
(none)
```

Every hit is prose or a non-hashing word match. **No pins.** No `evo_self_check.py` (the repo has not
adopted the self-endpoint contract). No pin ruling is needed at STEP 4.

## Q4 Do source changes take effect without a rebuild?

**No.** The site is baked into an nginx image by a multi-stage `Dockerfile` (`pnpm -C theater build`,
then `COPY .`), with no bind mounts and no hot reload (the guide: "a change is served only after a
rebuild"). `docker-compose.yml` has no `volumes:`. No systemd user unit names the repo
(`grep -ls '/home/evan/EVOsystem/portfolio_site' ~/.config/systemd/user/*` prints nothing). No worker or
schedule imports from the tree. Production is `infra/deployment/prod/deploy-portfolio.sh` (off-box
build and ship). A Vite dev server (`pnpm -C theater dev`) exists but only when someone runs it.
Report note for Evan: a rebuild (`rebuild-restart` skill) or a prod deploy ships any deletion.
STEP 8 needs no integration gate for this repo.

## Q5 Entry points (retention roots)

In-repo roots:
- **Theater app:** `theater/index.html` → `<script type="module" src="/src/main.ts">`; `main.ts`
  imports the engine, host, loader, lot, page, `projects.ts` and `scenes/registry.ts`, and
  `styles/global.css` (which imports `tokens.css`).
- **Theater library entry:** `theater/src/index.ts` (the `portfolio-theater` package surface: adapter
  types, placeholder, the `adapterContract` conformance kit). It must never be imported by
  `main.ts`. Its only declared consumer is a future "SD11 Wix entry"; the fleet scan finds no
  importer of `portfolio-theater` (below).
- **Vite config:** `theater/vite.config.ts` names `vite-site-assets.ts` (dev/preview middleware) and
  `src/test-setup.ts` (Vitest setup). `theater/playwright.config.ts` runs `pnpm build && pnpm preview`.
- **Static site:** `index.html`, `projects/*.html`, `404.html`, `assets/js/*`, `assets/css/*`,
  `images/` (served by nginx; `nginx.conf`). The homepage links `/theater/`.
- **Serving/build:** `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `.dockerignore`.
- **Scripts named in the guide/skills:** `scripts/validate_codex_setup.py`,
  `scripts/showcase/stale_captures.py` (`refreshing-showcase-captures`), `scripts/art/new-run.sh` and
  `scripts/art/contracts/sprite/*.mjs` (`treating-art-sprites`), `theater/e2e/nginx-parity.sh`.
- **Hooks:** `.githooks/{pre-commit,pre-push,post-checkout,post-commit,post-merge}`.
- No decorator or by-name registration beyond `scenes/registry.ts` (an explicit array).

Cross-repo:
- `$L/naming-files.txt`: 596 files outside the repo name `portfolio_site` (327 under
  `/home/evan/EVOsystem/.worktrees`, 99 voice-trainer corpus JSON, 77 infra, 54 chud, 24
  evosystem-wrapped, 7 app-dash, 7 projects, 1 docs).
- `$L/cross-repo-paths.txt`: 80 distinct `portfolio_site/<path>` mentions. Reviewed: all are docs,
  specs, session logs, corpus/review JSON payloads, and fixture registries naming the repo or a
  doc/image path. None imports a theater module or runs a repo script.
- Non-path references reviewed by repo: chud `backend/config.py`, `scripts/regen_fleet_report.py`,
  `reviewer/extract/checklist.py` (repo name in registries); evosystem-wrapped
  `collectors/{paths,git}.py` (reads the repo's git history by path); infra
  `context_load.py`, `okf_provenance_check.py`, `.okf/sources.json` (repo registries);
  infra `scripts/sprites/measure/measure.py` (a **port** of `key.mjs`, not a reader of it). None is a
  module-level reference.
- The one true reference: `infra/deployment/prod/deploy-portfolio.sh` builds the image from the repo
  (the Dockerfile, hence the whole theater build). Written to `cross-repo-refs.tsv`.
- Outside writes (`$L/outside-writes.txt`, 1 line): `scripts/art/new-run.sh:33`, a usage example
  naming `~/pics/CT-plate.jpg` as an **input**. The repo writes nothing outside itself.
- `import-roots.txt` (xrepo_scan `roots`): `base:.`, `base:scripts`, `base:src`, `npm:portfolio-site`,
  `npm:portfolio-theater`, `npm:portfolio-art-tools`, `py:validate_codex_setup`, plus
  `base:backend-absent{,/src}` (artefacts of the placeholder `BE_REL`; the directory does not exist).
- `installed-elsewhere.txt`: 0. `path-importers.txt`: 0. `consumer-repos.txt`: empty (no repo
  consumes this one by import or install).
- Fleet scan (`package-importers.txt`): **0 HIT, 0 UNPARSEABLE** (the file is empty).
- `q5.sha256` pins import-roots.txt, consumer-repos.txt and package-importers.txt.
- Residual: a consumer that names neither this repo, a path in it, a file it writes, nor an import
  root cannot be found mechanically (for example the live site's visitors, or a future SD11 Wix
  embed of the library entry). That residual is why every deletion needs Evan's DEAD ruling and why
  uncertain means KEEP.

## Q6 Frontend source kinds

```
$ find $FE/src -type f | sed 's|.*\.||' | sort | uniq -c
      2 css
     55 ts
```

Only `.ts` (and two `.css`). No `.svelte`/`.vue`/`.tsx`: chud's scanner and the coverage include
(`src/**/*.{ts,tsx}`) need no widening beyond the `FE=theater` root.

## Q7 External-state fixtures

```
$ git grep -nE "delete_collection|…|\.delete\(|…" -- '*conftest*.py' '*fixtures*' '*/tests/*.py' '*.test.ts' '*.test.js' | grep -v '/archive/'
theater/src/adapters/gsap-timeline.contract.test.ts:90:      outstanding.delete(handle);
```

| hit | verdict | why |
|---|---|---|
| `gsap-timeline.contract.test.ts:90` | **owned** | `outstanding` is a local `Set<number>` of rAF handles the test's own wrapper created; no shared state |

The suite runs in jsdom with no database, network service or shared path. No `not owned` hit: Q7
blocks nothing.
