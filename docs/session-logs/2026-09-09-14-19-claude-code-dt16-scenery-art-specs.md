---
date: 2026-09-09
agent: claude-code
type: phase-execution
mode: attended
phases: [DT16]
repos: [portfolio_site]
---

## Accomplished

DT16 executed and committed under DT11's `GO` row — the full tree branch, not the
`NO-GO-TREES` override.

- **`theater/e2e/scenery.spec.ts`** (5 tests): 88 trees present, every one
  `data-mask="ready"` with computed `visibility: visible` and computed `mask-image` /
  `-webkit-mask-image` containing `art/tree-<own variant + 1>.` — read per element in one
  `$$eval` and asserted against the URL that element's own `data-tree-variant` says it
  should carry; the first left tree's rendered matrix (`m41 -900`, `m43 -100`, `m11 1.05`);
  the wagon `data-car="ready"` with a box of real height; and the click-under-the-wagon
  scan at 390×720 and 1440×900.
- **`theater/e2e/art.spec.ts`** (4 tests): each sprite loaded through an `Image` on the
  app's own origin, drawn to a canvas and read with `getImageData` (`EVO-TOOL-054`,
  `EVO-TOOL-055`) — 1600×900 / 800×1200, four corner alphas 0, transparent fraction in
  [0.15, 0.85], the car's subject ≥ 960px wide, each tree's subject reaching ≥ 95 % down
  its canvas.
- **`theater/e2e/nginx-parity.sh`**: two new lines for the car sprite, with the extension
  read out of `ART_EXTENSION: ArtExtension` in `src/lot/art.ts` by grep so the script
  cannot drift from the constant.

**The phase's one real finding, measured, not assumed: at 1440×900 screen 0's box never
overlaps the wagon's, so the desktop click-through cannot be constructed.** DT16 was
written expecting the 390×720 measurement to generalise (`<context>`: "the scan reliably
finds it"). It does not. The narrow layout stacks the screens single-file down the lane,
so screen 0 grows straight out over the wagon and the click lands at progress ≈ 0.069.
The wide layout puts screen 0 at `x = -OFFSET` with a yaw, so it flies off to the **left**
as it passes the camera: scanned at 41 samples, the horizontal gap closes to zero at
progress ≈ 0.0605 while the vertical gap is still **8.3 px**, and by the time the vertical
gap closes (≈ 0.0619) the horizontal one has reopened to ≈ 10 px. A near-miss, not a
margin. The only boxes that do intersect at desktop width are the degenerate ones a screen
projects once it is *behind* the camera (progress ≥ 0.0968, past the end of the scan),
where `elementFromPoint` at the intersection returns nothing at all — no click there to
steal. Confirmed by a separate all-screens sweep to progress `screenProgress(4)`: every
intersection found at 1440×900 was a post-camera-plane box with `owner=none`.

What shipped instead of a conditional skip: `VIEWPORTS` carries a measured `overlaps`
literal per row (`EVO-UNI-018`). Both rows assert the *computed* `pointer-events` is
`none`; both assert the sweep really happened (closest approach < 40 px — "no overlap" is
equally true of a page whose lot never built, `EVO-UNI-118`); the 390×720 row lands the
click, the 1440×900 row states the non-overlap as a claim that goes red the day a screen
does reach the wagon there.

Attempted and abandoned: nothing. Not done, by scope: no `src/` change survives this
session (the falsifications' edits were all restored and verified by `cmp`).

## Commits

portfolio_site:

- `3d3bade` test(dt16): scenery and art Playwright specs; nginx parity for the sprites
  — the two specs, the parity script, the roadmap's amended `## Done` paragraph and its
  DT16 Changelog row.
- (this log's own commit, following)

## Uncommitted work left behind

None. `git diff --quiet -- theater/src theater/public` passes; every falsification was
restored by `cp` from its backup and verified with `cmp`.

## Verification

All run from `/home/evan/EVOsystem/portfolio_site` unless noted.

- `pnpm format:check` — pass (also enforced by the pre-commit hook at commit time: pass).
- `pnpm -C theater typecheck` — pass. `pnpm -C theater lint` — pass.
- `pnpm -C theater test` — **402 passed / 24 files**, 0 failed.
- `pnpm -C theater test:e2e` — **57 passed**, 0 failed (was 48 before this phase).
- `grep -n 'waitForTimeout' theater/e2e/{scenery,art}.spec.ts` — exit 1, no hits
  (`EVO-TOOL-071`); the scan waits on `scrollToSceneProgress`'s settle.
- `grep` for the positive hit-test in `scenery.spec.ts` — hit at line 347
  (`?.closest(screen)`, `screen` = the imported `SCREEN`).
- `grep -n 'ART_EXTENSION: ArtExtension' theater/e2e/nginx-parity.sh` — hit.
- `docker compose build && docker compose up -d --force-recreate` then
  `bash theater/e2e/nginx-parity.sh` — **10/10 OK**, including
  `/theater/art/car.png is served 200` and `is image/png`.

Falsifications (`EVO-UNI-061`), each backed up and restored by copy (`EVO-UNI-090`), each
restore verified with `cmp`:

1. `treePlacements` replaced by a typed stub returning `[]` → `scenery` exit 1, **2 tests
   fail**: the hand-written `PLACEMENTS.length > 0` floor and the transform test. Worth
   recording that the *count* assertion did **not** fail — it compares 0 against 0,
   because the spec imports the same module the page is built from (`EVO-UNI-207`). The
   floor is the only reason this falsification lands.
2. `.sds-lot__car { pointer-events: auto !important; }` → `scenery` exit 1, **both
   viewports fail** on the computed check; `click-through.spec.ts` stayed green, so the
   car does not overlap a band-middle screen at desktop and there is no second finding
   there. Then, with the computed assertion temporarily disabled and the CSS still broken,
   the 390×720 **hit-test half fails on its own** — `elementFromPoint` at 195,588 returns
   `null` for `closest('a.sds-screen')`. Both halves are load-bearing.
3. `car.png` truncated to an 8-byte PNG signature → `art` exit 1, one test fails with
   "the browser could not load /theater/art/car.png"; the three trees still pass.
4. Beyond the phase's list, because the per-variant mask assertion is new law: variant 1's
   two `mask-image` properties skipped in `#placeMask` while still setting
   `data-mask="ready"` → the assertion fails with **30 trees** computing `mask-image:
   none`, while count / ready / visible / tree-0's URLs all still hold. This is the exact
   Part 3B failure the one-tree check would have passed.
5. `ART_EXTENSION` flipped to `svg` → the two new parity lines go red
   (`car.svg` 404, `text/html`), proving they read the constant rather than a literal.

Served-page check (nginx container, Chromium via Playwright, `?period=sunset`, `night`,
and no parameter × 1440×900 and 390×720 — the manual comparison, driven rather than
hand-clicked):

- 88 trees, 88 with computed `visibility: visible`, at every period and both widths.
- `data-car="ready"`, computed `pointer-events: none`, in all six combinations.
- `--sds-headlight` 0 (afternoon, the unpinned clock) / .5 (sunset) / 1 (night) — the
  glows and beam fade by day as the composition asks.
- **Zero `[sds]` console warnings and zero page errors** across all six.
- `SDS-001`: driving to progress 0.35, away to 0.8, and back gives a **byte-identical
  engine state** (world matrix, all 20 `--sds-screen-lit` values, tree transforms, car
  transform) at both widths. Pixels match at 390×720; at 1440×900 **136 px of 1,296,000**
  differ, max channel delta 16, confined to a 5×32 box that `elementsFromPoint` identifies
  as a distant screen's `<video>` — the decoder's frame, not the seek. The control (same
  position sampled twice with no drive between) is byte-identical, so the rasteriser is
  deterministic.
- Compared against `docs/wireframes/theater-drive-in-theme.html` rendered at both widths:
  the composition matches — trees lining both sides and never in front of a screen, the
  wagon bottom-centre on the marked road with the beam ahead and tail-light glows, sky and
  orb per period. Two expected differences: the treeline is denser than the wireframe's
  (DT11's `GO` → `TREE_SPACING = SPACING / 2`), and the wagon is DT14's sprite where the
  wireframe carries its own placeholder SVG, which the wireframe's annotation predicts.

Skipped: nothing.

## Blockers

None.

## Open flags

- **The desktop car-click is unprovable by construction, and that is now load-bearing on
  one assertion.** At 1440×900 the only thing standing between a responsive
  `pointer-events: auto` and a stolen click is the computed-cascade assertion — there is
  no click to land there as a second witness. Falsification 2 shows it fails, so it works;
  but it is a single point of proof at that width, and if the composition ever moves so a
  screen does reach the wagon at desktop, the `overlaps: false` literal goes red and
  somebody has to write the click. That is the intended trigger, not a bug.
- The near-miss is **8.3 px**. A few pixels of change to `GROUND_LINE`, the car's
  `bottom: -1%`, its `clamp(320px, 38vw, 620px)` width, or the screens' `OFFSET` could
  flip the desktop row to overlapping. `SWEEP_PX = 40` absorbs retiming noise; the
  `overlaps` literal deliberately does not absorb a real move.
- `scenery.spec.ts`'s two click tests carry `test.slow()`: 41 settled scroll positions is
  ~33 s at desktop width against a 30 s default when the whole suite competes for the
  software rasteriser. The suite's wall clock is now ~55 s. Same allowance
  `keyboard.spec.ts` and `active-screen.spec.ts` already take (DT13), not a new pattern.
- DT11's protocol is still unrun (its row is a ruling, not a measurement). DT16 was named
  in that row as "the first and only evidence that the trees and car are performant and do
  not steal a click". It now covers the click and the painting; it says **nothing about
  fps** — no frame timing was measured this session, at 88 trees or otherwise.
- Four `PENDING (decided-by: human)` items remain open across the DT13/DT14/DT15 logs
  (`fold_back_audit.py`: `applied=13 no_change=20 pending=4 needs_decision=0`, oldest 0
  days). None blocks anything.

## Rules-index candidates

- **A geometric precondition measured at one viewport is not evidence for another, and a
  test that loops over viewports must state per-viewport whether the precondition holds.**
  DT16 required "scan for the overlap, then click it" at 390×720 and 1440×900 from a single
  measurement taken at 390×720. At 1440×900 the overlap does not exist — the wide layout
  yaws screen 0 off to the left as it passes the camera and it misses the wagon by 8.3 px.
  Carry the answer as a per-case literal (`{ width, height, overlaps: true|false }`)
  asserted with `expect(found).toBe(case.overlaps)`, never an `if (!found) return;` — a
  bare early return turns a case whose precondition silently stopped holding into a green
  pass, which is the shape `EVO-UNI-061` is about. Pair it with a witness that the sweep
  happened at all (here: closest approach < 40 px), or the negative case passes on a page
  that never rendered — `EVO-UNI-118` for a precondition rather than for two greps.
  promote → tooling

- **When a browser test asserts a per-element property over a collection, assert each
  element against the value *its own* attributes say it should carry, not against one
  shared expectation.** Measured twice on the same code: with variant 1's masks stripped,
  `count=88 ready=88 visible=88` and tree 0's two URLs all hold while 30 trees compute
  `mask-image: none`. A collection-level count and a first-element spot check are the same
  vacuous check written twice. Reading `data-tree-variant` per element and deriving the
  expected URL from it catches both a lost property and one applied to the wrong member.
  promote → tooling

## Meta-prompt / skill / doc updates

- APPLIED: DT16's `## Done` paragraph rewritten to state what the browser proof actually
  covers — the click landed at 390×720 only, the desktop row proving the cascade and the
  measured non-overlap — plus the DT16 Changelog row carrying the full measurement →
  `docs/roadmaps/drive-in-theme-roadmap.md` (see Commits: `3d3bade`). Mechanical under
  fold-back triage item 2: a claim contradicted by this session's own measurement, and its
  companion changelog row.
- PENDING (decided-by: human): DT16's `<context>` geometry note and `<constraints>`
  over-generalise a 390×720 measurement into a both-viewport requirement ("the scan
  reliably finds it"; "**Click-through under the car**, as a loop over **two viewports**"),
  which is false at 1440×900 and cost this session a failing run to discover. The
  measurement itself is correctly labelled "measured 2026-09-08 at 390×720" — it is the
  constraint built on it that over-reaches. Editing an executed phase's `<constraints>` is
  a spec-body change, not a mechanical correction, so it is not applied here; the finding
  is recorded in `## Done` and the Changelog instead. Next action: Evan decides whether
  the phase body is amended in place or left as the historical instruction with the
  Changelog as its correction.
- NO-CHANGE: `.claude/skills/rebuild-restart/SKILL.md` — followed for the parity run
  (`docker compose build && up -d --force-recreate`, then polled `/` for 200 before
  curling, exactly as its Traefik note says); served as written.
- NO-CHANGE: `.claude/skills/writing-session-logs/SKILL.md` and the shared infra copy —
  `fold_back_audit.py` run at the start against `docs/session-logs/` with no
  `STALE_NEEDS_DECISION`; template followed as written.
- NO-CHANGE: `AGENTS.md`, `theater/skills/rules-index/SKILL.md` — read for orientation and
  law; the pnpm-flag and exit-status warnings in DT16's `<context>` were honoured (every
  filtered run went through `./node_modules/.bin/playwright` and redirected to a log with
  `$?` captured, never a pipe into `grep`); served as written.

## Next steps

- DT16 is the roadmap's final phase; the drive-in theme is complete. Nothing is queued
  behind it.
- If Evan ever wants DT11's protocol actually run, the probe and checker are still at
  `docs/spikes/2026-09-08-scenery-probe.html` and `docs/spikes/art-check.html`, and the
  decision row can be amended in place. DT16 measured no fps.
- The four open `PENDING (decided-by: human)` items in the DT13/DT14/DT15 logs plus the
  one above are Evan's to rule on.
- Raw session logs from 2026-09-08 and 2026-09-09 are accumulating (8 files, 2 distinct
  completed days). One more day makes 3 → `sweeping-session-logs` becomes due.

## Pointers

- Roadmap + Changelog row: `docs/roadmaps/drive-in-theme-roadmap.md` (Phase DT16, the
  Decision records table's DT11 row, and the 2026-09-09 DT16 Changelog row).
- Spec: `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`.
- Wireframe compared against: `docs/wireframes/theater-drive-in-theme.html`.
- Prior phase logs: `2026-09-09-13-25-claude-code-dt15-blocked-on-dt11-decision-row.md`,
  `2026-09-09-13-12-claude-code-dt14-sprites-via-codex.md`.
- No handoff written.
