---
date: 2026-08-25
agent: claude-code
type: feature
phases: [DT8, DT9]
repos: [portfolio_site, docs]
---

## Accomplished
- Piloted the automated showcase flow on chunk-norris, by hand in this session: one Playwright run against `chunk-norris.localhost` recorded the demo walk (Health → Collections → Test Query → Data Quality) and took four 1280×800 screenshots; ffmpeg encoded the clip per the spec convention (h264 960×600 yuv420p, no audio, 9.6 s, 150 KB). Card, `projects/chunk-norris.html`, prev/next splice (spead-read ↔ chunk-norris ↔ media-cloud-web-tools), `projects.ts` entry and exit-list `<li>` landed; the lot now has nine screens. No "View on GitHub" CTA — the repo has no remote.
- Made the theater's lot tests count-agnostic (`build-lot.test.ts`, `lot-scene.contract.test.ts` derived from `projects.length`); `projects.test.ts` keeps deliberate literals, bumped to nine.
- Wrote the `portfolio-showcase` meta-prompt (rollout kind) in the docs repo, generalized from the pilot, by following `writing-meta-prompts`: seven placeholders, decisions section, 16-app Coverage table (four already-paged apps marked clip-only), self-contained fence meant to be pasted into a session started in the *target app repo*. Every fence command was dogfooded against the live container.
- Roadmap Changelog row for the pilot; DT9 hand recording now only for the four non-EVOsystem projects.
- Attempted, not done: DT8's `adding-project-demo-clips` skill is still unwritten — the recipe lives in the meta-prompt's STEP 3.

## Commits
portfolio_site:
- `94793bf` feat(projects): add Chunk Norris card, page, clip and theater screen
- `2126a49` docs(roadmap): record the chunk-norris pilot and the portfolio-showcase meta-prompt
docs:
- `1ddcedd` docs(meta-prompts): add portfolio-showcase meta-prompt (+ writing-meta-prompts runlog line)

## Uncommitted work left behind
None. (The three loose full-page PNGs previously untracked in `images/chunk-norris/` were replaced by the captured set and committed.)

## Verification
- `pnpm -C theater test` — 298 passed (21 files), after the count-agnostic rewrite; before it, 8 failed in 2 files on hardcoded eights.
- `pnpm -C theater typecheck` — pass.
- `pnpm format` + pre-commit Prettier hook — pass on both commits.
- `docker compose build && docker compose up -d --force-recreate` — pass; curl via `Host: portfolio-site.localhost`: `/`, `/projects/chunk-norris.html`, both spliced neighbours, `01.png`, `04.png`, `demo.mp4` (video/mp4, 150108 B), `/theater/` all 200.
- `pnpm -C theater test:e2e` — 19 passed, parameterised over nine screens ("screen 5 goes to chunk-norris").
- Fence probe `theater-check.mjs` run verbatim from the meta-prompt — `{ lit: '1', clip: null }` at the chunk-norris band; screenshot shows the marquee and a clip frame.
- `ffprobe` on the clip — h264,960,600,yuv420p, 9.56 s, zero audio streams.

## Blockers
None.

## Open flags
- chunk-norris's Sources tab renders a raw AIOS UUID in its heading (`SourcesList` gets `aiosName` = id from the rail's auto-select); skipped in the walk rather than fixed — it is the app's bug, noted in the meta-prompt example.
- `theater/e2e/reduced-motion.spec.ts` and `geometry.ts` comments still say "eight"/`lotZ(k / 9, 8)`; code is count-agnostic, prose is stale.
- The spec still says "eight screens" throughout; the lot is now open-ended by decision (every EVOsystem app gets a screen).
- co-author is not in `infra/domain-registry.md`; its Coverage row says to find the Traefik host in its compose file first.

## Rules-index candidates
None. (No rules-index in this repo.)

## Meta-prompt / skill / doc updates
- `writing-meta-prompts`: served well. One paste-test gotcha worth folding in if it recurs: a Go template in a `docker ps --format '{{.Names}}'` line reads as a placeholder — the placeholder audit grep should flag any `{{` not in the table.
- `rebuild-restart` and `adding-project-screenshots`: good as-is; the meta-prompt restates their essentials because the target session won't load them.
- Roadmap DT8: its skill should now be written *from* the meta-prompt's STEP 3 rather than the reverse, so there is one recipe (`EVO-UNI-024`).

## Next steps
- Evan: run `docs/meta-prompts/portfolio-showcase/portfolio-showcase.md` in a fresh session per app repo (Coverage table order is a fine order); the four clip-only apps first are the cheapest shakedown.
- Write DT8's skill as a thin restatement of the meta-prompt's STEP 3, or fold DT8 into the roadmap as "superseded".
- DT10 deploy is still the gate for any of this reaching the public host.

## Pointers
- Roadmap changelog row: `docs/roadmaps/drive-in-theater-roadmap.md` § Changelog, 2026-08-25 DT8/DT9 (partial).
- Meta-prompt: `/home/evan/EVOsystem/docs/meta-prompts/portfolio-showcase/` (prompt, changelog, runlog).
- Spec: `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md` § Media pipeline.
