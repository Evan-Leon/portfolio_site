---
date: 2026-10-18
headline: 73 commits pushed and deployed to evanleon.com at 8afa652
agent: claude-code
type: qa
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished
Pushed `main` to origin (f468b08..8afa652, 73 commits: theater perf work, DT9 showcase re-captures, skills/docs). Deployed 8afa652 to the droplet with `infra/deployment/prod/deploy-portfolio.sh`. I ran the script from a detached worktree at origin/main because the untracked `docs/planning/test-audit/pilot/export-files.txt`, left by the in-flight test-audit session, trips the script's dirty-tree guard. The worktree was removed after the deploy.

## Commits
None besides this log (the push only moved existing commits).

## Uncommitted work left behind
`docs/planning/test-audit/pilot/export-files.txt` is untracked and belongs to the test-audit pilot session. I did not touch it.

## Verification
- Deploy script local smoke: `/` 200, `/theater/` 200, `/projects/nom-noms` 200, `/nope` 404, `/package.json` 404: pass.
- Public through Cloudflare: `/` 200, `/theater/` 200, `/projects/nom-noms` 200, `/nope` 404: pass. The edge copy of `styles.css` is fresh.
- The `/theater/` asset hashes on prod (`index-RuOR7gMc.js`, `index-B2yc15-N.css`) match the 8afa652 image: pass.

## Blockers
None.

## Open flags
- Re-captured clips and screenshots under `images/` have non-hashed URLs. The Cloudflare edge may serve the old ones for up to 4 h, and the script only checks `styles.css` for freshness. Evan can purge in the dashboard if the new captures need to be live sooner.
- `deploy-portfolio.sh` treats untracked files as dirty, so any in-flight docs scratch file blocks a deploy. The workaround is `PORTFOLIO_REPO=<clean worktree>`.

## Rules-index candidates
None.

## Meta-prompt / skill / doc updates
- NO-CHANGE: infra/deployment/prod/README.md § Deploying the portfolio site — the procedure and script served as written

## Next steps
None.

## Pointers
`../infra/deployment/prod/README.md`, `../infra/deployment/prod/deploy-portfolio.sh`
