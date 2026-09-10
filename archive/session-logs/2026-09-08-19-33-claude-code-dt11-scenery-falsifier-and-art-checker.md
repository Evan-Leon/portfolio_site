---
date: 2026-09-08
agent: claude-code
type: phase-execution
mode: attended
phases: [DT11]
repos: [portfolio_site]
---

## Accomplished

DT11's build half is done. Both files exist, are committed, and every gate the
phase specified for the *building* session passes. The measurement and the
verdict remain Evan's (Manual Verification) and no decision row was written.

**`docs/spikes/2026-09-08-scenery-probe.html`** — copied from DTF's frozen
receipt and rebuilt around production rather than around DTF:

- 20 screens; `theater/src/styles/global.css` 196–470 transcribed with the
  `sds-` class names kept, so the shipped `--sds-screen-lit` brightness
  `calc()`, the `color-mix()` marquee and the custom-property placement are what
  is measured — not DTF's directly-tweened `filter`. `theater/src/styles/tokens.css`'s
  night values inlined; `build-lot.ts`'s timeline shape reproduced including
  `immediateRender: false` on the ramp-down; DT13's ground (`20800px` at
  `translateZ(800px)`) and road applied.
- Production's media pattern, which is what the GO rests on: the twenty real
  slugs, twenty posters decoded and appended as `<img>` before measuring, sixteen
  real `<source>` clips, four poster-only screens, and a gate that shows
  `posters resident: N/20` and refuses to measure below 20/20. DTF's eight
  cycled synthetic clips are gone.
- Five variants — `lot20`, `car-only`, `scenery` (88 planes), `scenery-half`
  (44), `scenery-overload` (351, the failing control) — with plane counts
  confirmed in the browser, not derived on paper.
- Two mask sources: canvas-drawn PNG silhouettes (default) and the exported
  intrinsic-size SVG placeholders (`&masksrc=svg`). Both paint.
- The header pre-registers the six-step procedure and the five outcomes with the
  car gated before any tree branch, keeps the harness and natural-wheel result
  slots apart with a statement of what each protocol may decide, and records
  `SCREEN_COUNT = 20` as a snapshot of the registry.
- One pure `classify()`, fail-closed; `renderSummary()` delegates to it;
  `?selftest=verdict` drives it; the probe refuses to render a verdict unless
  that self-test printed all-match in the session. A `?verdict=…` mode computes
  the outcome from the stored medians plus the manual inputs.

**`docs/spikes/art-check.html`** — per-pixel acceptance, canvas only. Eight
predicates including the three placement ones (`bboxHeight`, `bboxBottom`,
`bboxCentre`) that the Part 3B counterexample showed a floating wagon would
otherwise pass; `dimensions` gates the rest; the checkerboard warning; the
composite strip over white, black and the six period `--sds-tree` colours (trees
as masks); the wrong-fixture control; the intrinsic-size SVG placeholder export.
Files reach the canvas through `readAsDataURL`; there is no network read.

**Not attempted** (out of scope by the phase): any change under `theater/`; the
fps measurement itself; the click/Tab pass in a real browser; the decision row.

## Commits

portfolio_site:

- `bcdc561` docs(dt11): production-shaped scenery falsifier probe and the art checker page

## Uncommitted work left behind

None. The Playwright drivers and screenshots live in this session's scratch
directory and are deliberately not committed.

## Verification

All in Chromium 151 (Playwright 1.62.1), driven from the scratch directory.

- **PASS** — probe structure, all six variant/mask combinations: 20 screens, 20
  posters resident, 16 `<source>`s, no fatal banner, no page error, and plane
  counts exactly 0 / 0 / 88 / 44 / 351 / 88 with every plane `data-mask="ready"`
  and computed `visibility: visible`.
- **PASS** — trees paint on both sides: on-screen plane counts at progress 0.15
  and 0.5 are left 38 / right 40–41 for both the PNG and the SVG mask source;
  confirmed visually in screenshots at both positions.
- **PASS** — `?selftest=verdict`: 10 vectors, every `EXPECTED == ACTUAL`, driver
  exit 0.
- **PASS (falsification, EVO-UNI-061)** — the same driver against a copy whose
  step-0 control check was stubbed out: 9/10 matched, `RESULT: MISMATCH`, exit 1.
  The driver can report a bad number.
- **PASS** — `art-check.html?selftest=1`: 17 rows (13 fixtures + the four
  exported placeholders), every row's verdict *and* failing predicate as
  declared, driver exit 0. The four placeholders report full structural PASS at
  1600x900 / 800x1200 — the SVG fallback's self-consistency is now measured, not
  assumed.
- **PASS (falsification, EVO-UNI-061)** — nine predicate mutations
  (`corners`, `transparentFraction`, `bboxWidth`, `bboxHeight`, `bboxBottom`,
  `bboxCentre`, `fileSize`, `dimensions` each stubbed to `true`; the checkerboard
  warning stubbed to `false`) each caught by exactly its own row(s) and nothing
  else. This is the check the earlier draft's self-test could not make.
- **PASS** — the wrong fixture: WARN, checkerboard ratio 100 %, and every
  numeric predicate green (bboxBottom 0px, bboxCentre 0.0px).
- **PASS** — probe verdict mode end to end: no manual inputs → `INVALID` naming
  the four missing fields; full inputs over a seeded median set → `GO`.
- **PASS (rig sanity, not the Manual Verification)** — in `car-only` and
  `scenery`, at three quarters through screen 3's band, screen 3 reads
  `--sds-screen-lit: 1`, `elementFromPoint` at its centre resolves to
  `a.sds-screen[data-screen-index="3"]`, its href is
  `../../projects/classic-golf.html`, and the first four screens are in DOM
  order. The real click and Tab in a real browser are still Evan's step 5.
- **PASS** — the phase's verification block: both files exist, the DTF receipt
  is untouched, 20 poster lines, 16 clip lines, no `probe-clip-`, no DTF store
  key, all five outcome words present, `SCREEN_COUNT = 20` labelled,
  `brightness(calc(` and `--sds-screen-lit` present, and the decision-record
  grep prints nothing.
- **PASS** — `prettier --check` on both files exits 0 (`docs/` is in
  `.prettierignore`, as the phase re-measured), and the pre-commit hook passed
  on the real commit.
- **PASS** — `fold_back_audit.py` over `docs/session-logs/`: `pending=0
  needs_decision=0`, no `STALE_NEEDS_DECISION`.

## Blockers

None.

## Open flags

- **The `&masksrc=svg` source is a `data:` URL, not a file.** DT15 will serve
  the SVGs from `theater/public/art/`; this phase ships exactly two files, so
  there is no third file to point at. What differs is the transport — an SVG
  document rasterised by the CSS engine as a mask under `preserve-3d` is the
  same path either way — and the deviation is recorded in the probe's header.
  If DT15 wants the file-URL case specifically, that is DT15's own check.
- **Two fixtures deviate from the roadmap's literal wording, both forced by the
  roadmap's own acceptance statements**, and both are documented in place:
  (a) the wrong fixture's transparent border is on three sides, not four — a
  transparent band *under* the subject fails `bboxBottom`, and the roadmap
  requires the fixture to warn "while every numeric check passes";
  (b) `off-centre-car` is pushed 270px (17 %), not 20 % — a 20 % shift pushes a
  ≥ 960px subject against the right edge and takes `corners` down with it, so
  the fixture would no longer isolate one predicate. 270px is already 3.4× the
  80px tolerance. `opaque-corner` similarly uses a wider subject so the corner
  pixel's drag on the bounding box stays inside the centre tolerance.
- **The classifier's "60 fps everywhere" case uses `overload 55`.** The roadmap
  described the car-interaction vector as "60 fps everywhere"; taken literally
  that makes `overload == scenery`, which step 0 — asserted by the row above it
  in the same table — turns into `INVALID`. The row keeps the control valid so
  it tests the step it names.
- **The scroll range is 2500vh**, production's own `100 + 120 × 20`, versus
  DTF's 1060vh. The harness therefore moves the world further per frame than a
  hand on a wheel does. Identical across variants, so the comparison holds; it
  is one more reason the absolute floor comes from the wheel run.
- The probe's geometry, scenery arithmetic, twenty slugs and clip availability
  are all hardcoded copies of `theater/src/` state as of 2026-09-08. A re-run
  must re-read the registry first (`EVO-UNI-128`); the header says so.

## Rules-index candidates

- A fixture built to isolate one predicate must be re-derived whenever a new
  predicate is added, because the perturbation it uses to break its own
  predicate can move a *different* measurement past a threshold — a single
  opaque corner pixel is part of the alpha bounding box, so it drags the box's
  centre by half the subject's margin and the "corners" fixture starts failing
  "bboxCentre" as well. The self-test then reports two failures where the table
  declares one, and the honest fix is to widen the fixture's subject rather than
  to loosen the new predicate. Sibling of `EVO-UNI-120` (a metric must be able
  to report a bad number) and `EVO-UNI-061`.
  promote → universal
- Proving a checker's predicates are live needs a mutation pass, not a fixture
  pass: run the suite once per predicate with that predicate stubbed to its
  passing value and assert that exactly the rows naming it flip. Nine such runs
  took under a minute here and are the only evidence that distinguishes "the
  fixtures are correct" from "the predicates are wired". A fixture table alone
  can be satisfied by a checker whose predicates all return `true`, which is the
  precise failure `EVO-UNI-061` names.
  promote → universal

## Meta-prompt / skill / doc updates

- NO-CHANGE: `docs/roadmaps/drive-in-theme-roadmap.md` § Phase DT11 — executed
  end to end; the build order, constraints and verification block were followed
  as written and the three places where a literal reading conflicted with the
  phase's own acceptance statements are recorded under Open flags rather than
  silently reinterpreted. No edit is warranted: the phase's binding statements
  are the ones that survived.
- NO-CHANGE: `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`
  § "Core assumption" and § "Art contract" — read as the source for the variant
  set, the tree arithmetic, the decision procedure and the contract thresholds.
  Every literal it pre-registers (`treePlacements(8)` = 40 / 20 entries, first
  left `z = -100`, first right `z = -300` / `-500`, last left `z = -7700` /
  `-7300`, `treePlacements(20)` = 88 / 44) was reproduced by the probe's inlined
  arithmetic and confirmed in the browser. Served as written.
- NO-CHANGE: `docs/wireframes/theater-drive-in-theme.html` — the source for the
  road, orb, beam, car and tree rules and for the four placeholder SVGs. Its
  inline URIs' missing intrinsic size is exactly as the spec describes, and the
  exported versions now pass the contract. Not edited (it is an approved
  wireframe).
- NO-CHANGE: `.claude/skills/writing-session-logs/SKILL.md` and its shared body
  in `../infra/` — followed for this log; template served as written.
- NO-CHANGE: `AGENTS.md`, `CLAUDE.md` — the pre-commit and Prettier guidance was
  accurate for these files (`docs/` ignored, hook passes).

## Next steps

- Evan runs DT11's Manual Verification: the harness walk from
  `?variant=lot20&measure=all&reset=1`, the two natural-wheel DevTools runs, the
  click/Tab and paint checks per variant, the `&masksrc=svg` smoke under GO or
  GO-REDUCED, then the decision row and `docs(dt11): decision record`.
- Sweep nudge: `docs/session-logs/` holds raw logs from 2026-09-06 and earlier
  plus five from 2026-09-08. Worth running `sweeping-session-logs` soon; not run
  here.

## Pointers

- Roadmap phase: `docs/roadmaps/drive-in-theme-roadmap.md` § Phase DT11;
  decision record table at the file's end (still `_not yet run_`).
- Spec: `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`.
- DTF's frozen receipt this probe was copied from:
  `docs/spikes/2026-08-25-transformed-video-probe.html`.
- No handoff written.
