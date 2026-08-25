---
date: 2026-08-25
agent: claude-code
type: planning
phases: []
repos: [portfolio_site, docs]
---

## Accomplished
Took the drive-in theater overhaul from idea to an execution-ready roadmap via
the roadmap meta-prompt, in one session:

- **Brainstorm — done.** Classified architectural; nine decisions taken by Evan
  through one-at-a-time questions (drive-through motion model; own `/theater/`
  page + hero CTA; vendor the skeleton, don't submodule; multi-stage Dockerfile;
  looping MP4 per project; all 8 paged projects; marquee with name; CTA hidden
  on phones/reduced-motion; DOM + CSS 3D via `gsapTimeline`). Design presented
  in seven sections, each approved. Spec written and committed.
- **Part 1 — done.** Spec enhanced in place: Step 1/1b searches (no prior art in
  session logs; the transformed-`<video>` assumption is unmeasured fleet-wide →
  DTF falsifier first), rules cited by ID from the shared tier + the skeleton's
  `SDS-*`, open questions resolved to decisions, every cited line re-verified
  (one drift caught: a concatenated-read offset on `registry.ts`).
- **Wireframes — done and approved** (`docs/wireframes/theater.html`,
  `index-hero-cta.html`), rendered headlessly to check composition before
  handing over; two 3D bugs caught that way (`nth-child` counting the ground
  div; ground plane rotated toward the camera). Marquee toned down on Evan's
  note.
- **Part 2 — done.** `docs/roadmaps/drive-in-theater-roadmap.md`: DTF, DT0–DT9.
  All runnable verification commands executed against pass AND fail fixtures
  before the first commit (caught two over-broad greps). Two cold **Sonnet**
  evaluators (code-truth, structure) returned 16 findings: 15 accepted, 1
  rescoped, 0 rejected; corrective commit landed.
- **Part 3 — done.** Prompt prepared (`docs/roadmaps/drive-in-theater-part3-prompt.md`),
  Evan ran Codex and pasted the review back the same session: 1 CRITICAL + 5
  MAJOR + 2 MINOR → 7 accepted, 1 rescoped, 0 rejected. The CRITICAL: the
  roadmap had no path to production — `evanleon.com` is served from the
  droplet root, not this container, and no workflow exists (both re-verified).
  Fixed structurally with a new **DT10** (deploy workflow, `IMAGE_TAG`
  rollback, recovery doc, asset audit, `CUTOVER: GO/NO-GO` gate). Also: DTF
  now reproduces the production rendering path with a measured `reduced`
  variant and a defined sampling protocol; `images/el-blackjack/01.png` found
  to be a 1×1 PNG → poster-dimension gate; `LotSnapshot` observes rendered
  state; DT6 sweeps all eight screens with one breakage per spec; DT0 deletes
  the canvas describe block. Receipt committed. Roadmap final at `4324fe1`,
  twelve phases.
- **Repo hygiene — done.** Removed the blanket `docs/*` gitignore (added
  2026-07-23 with the session-log adoption) that had silently kept the
  2026-05-19 swiper-migration spec/plan and `docs/helpers/` out of git; those
  files are now tracked.
- **Attempted, not done:** nothing — DTF/DT0+ are deliberately not started.

## Commits
portfolio_site:
- `189f77e` chore: stop gitignoring docs/; track the orphaned swiper-migration spec and plan
- `bfba85a` docs: design spec for the drive-in theater
- `4d807a4` docs(spec): roadmap meta-prompt Part 1 — rules, prior art, core-assumption search
- `959cdb9` docs(wireframes): candidate theater page and index hero-CTA wireframes
- `c9e55bd` docs(wireframes): understated marquee
- `0a23820` docs(roadmap): drive-in theater roadmap — DTF, DT0–DT9 (Part 2)
- `647f093` docs(roadmap): Part 2 evaluation — 16 findings, 15 accepted, 1 rescoped
- `fcf5e2f` docs(roadmap): Part 3 review prompt for Codex, pinned to 647f093
- `df0a8d9` docs: session log (first write)
- `2e937a8` docs(roadmap): Part 3 (Codex) triage — 8 findings, 7 accepted, 1 rescoped, 0 rejected
- `4324fe1` docs(roadmap): two stragglers from the Part 3 triage
- (next) feat(images): real El Blackjack screenshot; docs: prerequisite marked met

docs: `8d14c31` runlog row (Parts 1–2, Part 3 handed off); `db476c2` appends
the Part 3 outcome to that row.

## Uncommitted work left behind
`images/chunk-norris/` (pre-existing, untracked, not mine — no project page
exists for it; noted as `[FYI]` in the spec). Nothing else.

## Verification
- Roadmap verification commands executed pre-commit with synthetic fixtures:
  DTF decision-row grep (no match on `_not yet run_` / ToC row; match on a
  synthetic GO-REDUCED row) — pass. DT7 `awk` block-scoped hide-rule checks
  (right block → 1, wrong block → 0) — pass after rebuilding the wrong fixture
  correctly. DT2 hex-fallback grep — **failed** on skeleton prose, narrowed to
  `#[0-9a-fA-F]{3}`, re-tested (prose 0, real fallback 1) — pass. DT4
  controls/autoplay grep — rewritten to match `setAttribute`/property, fixture
  ok→1 bad→0 — pass. DT0 narrowed canvas grep on the skeleton minus dropped
  files — empty as the branch expects — pass. DT4/DT8 ffmpeg `testsrc2` recipe
  + `ffprobe` format lines — pass (h264,960,600,yuv420p; no audio stream).
- Headless Playwright renders of both wireframes at 1440×900 and 390×844 — pass
  (after fixes).
- Pre-commit Prettier hook ran on the wireframe commits — pass.
- Part 3 triage re-probes: `file images/*/01.png` (el-blackjack 1×1 confirmed,
  seven real), `curl https://evanleon.com/theater/` → 404 and `infra/domain-registry.md`
  (prod not on this container) — both findings confirmed. New DT6 breakage
  commands fixture-tested (reveal regex removes exactly one entry;
  `activeScreen`/`lotZ` sed renames + stubs). DT10's audit-must-fail target
  confirmed 404 today.
- Not run: anything in `theater/` (does not exist yet); Docker builds.

## Blockers
None. Evan replaced `images/el-blackjack/01.png` (now 487×946) the same
session; the remaining prerequisite is DTF's browser measurement before DT0.

## Open flags
- (Resolved by Part 3 → DT10.) The image path to production did not exist at
  all; `evanleon.com` is not on the container. DT10's cutover is Evan's
  decision and is recorded as a gate.
- `scripts/validate_codex_setup.py` `EXPECTED_HIGH_VALUE` names skills this
  repo never had (incl. retired `phase-status`); left alone (out of scope).
- Root `pnpm-lock.yaml`/`node_modules` will grow substantially in DT0 (Vite,
  Playwright) in a repo whose only dev dep was Prettier.
- `images/chunk-norris/` still page-less.
- `projects/el-blackjack.html` references `02.png`–`05.png` that do not exist
  (pre-existing; `swiper-init.js` prunes them at runtime, but the
  `adding-project-screenshots` skill says not to leave placeholder slides).

## Rules-index candidates
None. (Repo has no rules-index — deliberate opt-out recorded 2026-07-23.)

## Meta-prompt / skill / doc updates
- `roadmap-meta-prompt.md` Part 2 phase template: the `{{ORIENTATION_SKILL}}`
  slot assumes a `project-context` skill; portfolio_site has none and the
  honest substitute was `AGENTS.md`. Propose: "or the repo's `AGENTS.md` when
  no orientation skill exists — say so in the phase."
- Same doc, "Independent evaluation": the code-truth evaluator spawned two
  sub-reviewers of its own (~270k tokens total). Propose adding to the
  dispatch instructions: "do not spawn sub-agents; do the verification
  yourself" — the split into two lenses is already the parallelism.
- Same doc, Part 3 "Who runs it": worked as written; the `awk` fence extractor
  needs the prompt file to contain exactly one four-backtick fence — worth
  stating next to the launcher.
- Same doc, "Aiming it": add a bullet — *the roadmap's deliverable must reach a
  user; ask who delivers it and whether that path exists.* Both Part 2 agents
  verified a Dockerfile that builds locally and neither asked how the image
  reaches production; the Decision Record's "unchanged mechanism" was an
  assumption the writing session never checked against `infra/domain-registry.md`.
- Same doc, Part 1 Step 1: "every file exists" is not "every file is valid" —
  a checked-in 1×1 placeholder satisfied `test -f`. Propose: when a phase
  depends on existing content assets, inspect them (`file`, dimensions, bytes),
  not just their presence.
- `superpowers:brainstorming`: the architectural path's terminal state is
  `writing-plans`; when the user names the roadmap meta-prompt instead, the
  handoff ("Part 1 follows a brainstorming session … skip Steps 1/3/4") worked
  cleanly. No edit needed.

## Next steps
1. ~~Replace `images/el-blackjack/01.png`~~ — done (487×946, committed).
2. DTF: a session builds the four-variant probe; Evan measures in Chrome +
   Firefox per the protocol and records the decision row.
3. DT0 onward, one phase per session, in ToC order (DT10 sits after DT7).

## Pointers
- Spec: `docs/superpowers/specs/2026-08-25-drive-in-theater-design.md`
- Roadmap: `docs/roadmaps/drive-in-theater-roadmap.md` (Changelog row 2026-08-25; DTF decision record table)
- Part 3 prompt: `docs/roadmaps/drive-in-theater-part3-prompt.md`; receipt: `docs/roadmaps/drive-in-theater-part3-codex-review.md`
- Wireframes: `docs/wireframes/theater.html`, `docs/wireframes/index-hero-cta.html`
- Runlog: `/home/evan/EVOsystem/docs/meta-prompts/roadmap/roadmap-runlog.md` (2026-08-25 portfolio_site row)
