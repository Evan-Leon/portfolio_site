---
date: 2026-07-23
agent: claude-code
type: phase-execution
phases: []
repos: [portfolio_site, infra, docs]
---

## Accomplished
Onboarded portfolio_site into EVOsystem local infra as `portfolio-site.localhost`
(app-intake pipeline step 1 of 6). Done:
- Replaced the leftover `serve`-based `Dockerfile.prod` with a single-stage
  `FROM nginx:alpine` `Dockerfile` (no build step — pure static HTML site).
- Added `nginx.conf` for the multi-page (non-SPA) site: `try_files $uri $uri.html
  $uri/ =404;` + `error_page 404 /404.html;` (serves the site's own 404 page, not
  an index.html catch-all).
- Wrote `docker-compose.yml` on `evo-net` with the dual `web`+`websecure` router
  pattern and `image: ghcr.io/evan-leon/portfolio-site:latest` — prod-ready but
  NOT cut over.
- Added `.env` (`DOMAIN=localhost`, gitignored) + committed `.env.example`; expanded
  `.dockerignore` (keeps `.git`, `docs`, `CNAME`, `*.md`, `.env` out of the webroot).
- Built the image, brought the container up, verified via curl.
- Local setup: added path to `~/.bashrc` `_evo_services`; added a Portfolio Site
  section to `infra/domain-registry.md`; created `.claude/skills/rebuild-restart/`.
- Added a dated Changelog entry to `docs/local-deployment/onboard-project.md`
  capturing the static-site nginx pattern and the `up -d --force-recreate` nuance.

Attempted-but-corrected: first `.dockerignore` also ignored `nginx.conf`, which
broke the `COPY nginx.conf` (`"/nginx.conf": not found`) — un-ignored it and added
`RUN rm -f /usr/share/nginx/html/nginx.conf` so it isn't served.

## Commits
None. (Per portfolio_site scope for this step — all changes left for user review.)

## Uncommitted work left behind
portfolio_site working tree: new `Dockerfile`, `nginx.conf`, `docker-compose.yml`,
`.env.example`, `.claude/skills/rebuild-restart/SKILL.md`, this log; modified
`.dockerignore`, `.gitignore`; deleted `Dockerfile.prod`. `.env` created but
gitignored. Pre-existing untracked `images/chunk-norris/` is not mine.
infra: `domain-registry.md` edited (Portfolio Site section). docs:
`onboard-project.md` Changelog entry. `~/.bashrc` edited (not a repo).

## Verification
- `docker compose build` — pass (nginx image built as ghcr.io/evan-leon/portfolio-site:latest).
- `docker compose up -d` + `docker compose ps` — container Up.
- curl (Host: portfolio-site.localhost): `/` 200, `/index.html` 200,
  `/projects/classic-golf.html` 200, `/assets/css/styles.css` 200 text/css,
  `/assets/js/main.js` 200, `/images/favicon.png` 200 image/png,
  `/nonexistent-xyz` 404 serving 404.html (`<title>404 — Lost in Space …</title>`),
  `/nginx.conf` 404 (not leaked into webroot).
- Traefik routers: `portfolio-site-web@docker` and `portfolio-site-secure@docker`
  both registered.
- rebuild-restart skill proven: appended marker to index.html → rebuild →
  `up -d --force-recreate` → marker served → reverted → rebuilt clean (final `/` 200,
  marker gone).
- `~/.bashrc` sourced clean; `docker-compose.yml` path resolves; auto-start no-ops
  on the already-running container.

## Blockers
None.

## Open flags
- Plain `docker compose up -d` after a rebuild did NOT swap the container onto the
  new image (served stale content) because `build:`/`image:` share the `:latest`
  tag; `--force-recreate` is required. Documented in the skill + onboard changelog.
- Live prod (`evanleon.com`, served directly from the droplet root, not
  containerized, not on evo-net) was intentionally left untouched — cutover is a
  separate future decision. No `.github/workflows/` created.

## Rules-index candidates
None. (No rules-index in this repo.)

## Meta-prompt / skill / doc updates
`onboard-project.md` / `setup-guide.md` were good but assumed a Vite build stage —
their nginx `try_files` snippet is the SPA `/index.html` catch-all, wrong for a
multi-page static site. Applied edits are in the onboard-project.md Changelog
(outcome, listed above), covering: single-stage static Dockerfile, multi-page
`try_files`/`error_page` config, the `nginx.conf`-in-context/webroot gotcha, and
the `--force-recreate` nuance.

## Next steps
- User to review the staged/unstaged changes and commit if satisfied.
- Continue the app-intake pipeline: step 2 (precommit-hook), then session-logs,
  rules-index, logging, prepare-codex — each in its own clean session. Pipeline
  status table: `docs/meta-prompts/app-intake/app-intake.md`.

## Pointers
- `docs/local-deployment/onboard-project.md` (Changelog: 2026-07-23 portfolio_site entry)
- `infra/domain-registry.md` (Portfolio Site section)
- `.claude/skills/rebuild-restart/SKILL.md`
