---
date: 2026-10-16
headline: Six redesigned apps re-captured; refreshing-showcase-captures skill added
agent: claude-code
type: feature
mode: attended
phases: []
repos: [portfolio_site, infra]
---

## Accomplished

- New repo skill `refreshing-showcase-captures`, with `scripts/showcase/stale_captures.py`. The script reads app↔slug pairs from the portfolio-showcase Coverage table and measures UI-source churn since each slug's last `demo.mp4` commit. It flagged six apps: app-dash, chud, logson, Prompt-heus, voice-trainer and mind-palace, at 908–15,898 UI lines changed. The other ten read ≤ 77, and that includes the three Evan named as unchanged (graces-tree 77, LeonsBudget 25, NomNoms 25).
- Re-captured all six (clip and screenshots). Six parallel Sonnet recons ran first, then six parallel Opus capture agents (meta-prompt STEPs 0–3). I reviewed each contact sheet before placement. Every walk was read-only, behind a GET-only guard plus API response filters for personal or internal strings. Nothing was seeded. Screenshot counts stayed the same, so no markup changed (Evan allowed count changes). mind-palace's fifth shot was dropped as weak.
- Evan pre-approved the flows and approved redeploying the stale frontends. The mind-palace and Prompt-heus frontends turned out to have empty bind mounts (`/app` held only `node_modules`, and `/` returned 404). `docker compose up -d --force-recreate frontend` fixed both. chud's dev server was already serving current source, so it needed no rebuild.
- Recorded the run in the infra Coverage notes and runlog. Folded two lessons into the skill: the bind-mount serve check, and running capture in parallel while placement stays sequential, with the recon and capture briefs kept in `briefs.md`.

## Commits

portfolio_site:
- `01c6ca5` feat(skills): refreshing-showcase-captures — stale-capture detector and refresh procedure
- `af159c5` feat(dt9): app-dash re-capture (clip + screenshots)
- `4d268dc` feat(dt9): chud re-capture (clip + screenshots)
- `673ad3e` feat(dt9): logson re-capture (clip + screenshots)
- `4182c10` feat(dt9): prompt-heus re-capture (clip + screenshots)
- `263e9c1` feat(dt9): voice-trainer re-capture (clip + screenshots)
- `57053e6` feat(dt9): mind-palace re-capture (clip + screenshots)
- `a619ef3` docs(skills): refreshing-showcase-captures — check what a bind-mounted dev server serves
- `39bd265` docs(skills): refreshing-showcase-captures — parallel capture and the recon/capture briefs
- `0dc56ee` docs(skills): refreshing-showcase-captures description matches the parallel-capture flow
- (this log)

infra:
- `c4a2a64` docs(portfolio-showcase): 2026-10-16 six-app re-capture — Coverage notes and runlog

## Uncommitted work left behind

None. Nothing pushed: a push to `main` deploys evanleon.com, and that is Evan's call.

## Verification

- `stale_captures.py`: exit 0. The control matched: Evan's three known-unchanged apps all read below the 300-line threshold.
- `python3 scripts/validate_codex_setup.py`: PASSED (5 skills).
- `prettier --check` over `scripts/showcase` and `skills`: pass.
- Every clip passed ffprobe: `h264,960,600,yuv420p`, duration 10.000000, no audio, 178–904 KB (all ≤ 1.5 MB).
- `docker compose build && up -d --force-recreate`: each of the 12 new files is served 200, with a byte size equal to the local file.
- `pnpm test:e2e` (theater): 61 passed. Unit tests were not run: no theater source changed.
- App repos' `git status` hash and HEAD before and after the agents: unchanged (EVO-UNI-111).
- `fold_back_audit.py --include-digests --open-only`: run at the end, not at session start. It shows 1 OPEN item: the 2026-09-14 G7 deferral, which is not stale, and this run did not seed anything.

## Blockers

None.

## Open flags

- mind-palace's new provenance and low-trust UI cannot be filmed: all 165 edges are curated. Showing it needs a throwaway Neo4j store plus a seed. No app has a committed seed yet (`docs/planning/showcase-demo-seeds/brief.md`).
- Bind-mounted dev-server frontends can silently serve an empty mount: 2 of 5 here. That is an app-infra issue, worth raising in those repos.
- app-dash: React "two children with the same key" console errors on the Activity tab (seen with the filtered timeline). The frontend image (2026-10-06) is behind the 2026-10-09 pipeline fix, which nothing in the clip shows.
- voice-trainer: `/write/written` holds Evan's private writing in the dev DB, and `/settings` shows a "Configure your AI provider" error banner.
- logson: span inputs still carry `RunContext(...)` reprs naming internal projects.
- mind-palace: entity Timeline strip labels overlap when dates are close (WWII, Byzantine).
- Page copy (feature cards, tech pills) was not rewritten for the redesigns. app-dash and Prompt-heus copy may now describe old views.
- The previous app-dash capture's two exclusions were never recorded anywhere. This run excluded "Leon's Mems", "Perfect Information Bureau", "Framingham" and "Rooms Skeleton" as a conservative guess.

## Rules-index candidates

None.

## Meta-prompt / skill / doc updates

- APPLIED: bind-mount serve check (empty `/app` mount, fetch a new module rather than comparing image dates) → `skills/refreshing-showcase-captures/SKILL.md` (see Commits: a619ef3)
- APPLIED: parallel capture with sequential placement, plus the recon and capture briefs → `skills/refreshing-showcase-captures/` (see Commits: 39bd265, 0dc56ee)
- APPLIED: Coverage notes and runlog row → infra `meta-prompts/portfolio-showcase/` (see Commits: infra `c4a2a64`)
- NO-CHANGE: `infra/meta-prompts/portfolio-showcase/portfolio-showcase.md` STEPs 0–3 — served as written for the capture agents. The bind-mount lesson lives in this repo's skill, because a fleet-wide meta-prompt edit needs its own gate.
- NO-CHANGE: `skills/adding-project-screenshots/SKILL.md` — counts unchanged, so it was not needed; served as written.

## Next steps

- Evan: review the six clips at `http://portfolio-site.localhost/` or `/theater/`, then push to deploy. Cloudflare caches assets for 4 h, so a stale image after the push is usually the cache.
- Optional: refresh the app-dash and Prompt-heus page copy for the redesigns, or add mind-palace's provenance once a showcase seed exists.

## Pointers

- Skill: `skills/refreshing-showcase-captures/SKILL.md`, `briefs.md`
- Meta-prompt: `../infra/meta-prompts/portfolio-showcase/portfolio-showcase.md` (Coverage), `portfolio-showcase-runlog.md`
- Seed brief: `docs/planning/showcase-demo-seeds/brief.md`
