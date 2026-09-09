---
date: 2026-09-09
agent: claude-code
type: phase-execution
mode: attended
phases: [DT11, DT15]
repos: [portfolio_site]
---

## Accomplished

Two things, in order: the session **stopped DT15 at its entry gate**, then ran it to
completion once Evan supplied the missing verdict.

**1. The gate held.** DT15's `<branch>` block requires a verdict in the roadmap's Decision
records table before any code is written. The DT11 row was still the placeholder
`| DT11 | _not yet run_ | ... |` with all ten measurement cells empty, so nothing was
written and the phase was reported blocked. The verdict is not inferable from what had
already shipped: DT14's three tree sprites rule out `NO-GO-TREES` in practice but do
**not** separate `GO` (`TREE_SPACING` 400) from `GO-REDUCED` (800), and every literal in
`scenery.test.ts` differs between them.

**2. Evan ruled `GO`**, saying the testing had effectively happened during DT13 (which ran
accidentally). Checked before writing: DT13 measured the **ground plane**
(`GROUND_SQUASH` 1/4/6/8 on real hardware, 134 → 51 ms/frame) and its own log states
*"Trees, car and beam are absent and are DT15."* So the ruling is backed by real
hardware evidence about the page, but **not** by DT11's six-step procedure. The decision
row was written to say exactly that — verdict `GO`, every measurement cell `not taken`,
and a footnote recording what does and does not back it, what was never run, and that
DT16 is consequently the first evidence the scenery is performant and does not steal a
click. The plain `GO` token is preserved so the roadmap's own
`^\| DT11 \| (GO|…) \|` grep still matches.

**3. DT15 shipped in full**, on the `GO` branch:

- `lot/scenery.ts` + tests — `TREE_SETBACK` 420, `TREE_SPACING` 400, `TREE_LEAD` 100,
  `TREE_VARIANTS` 3, the eight-row jitter table, `treePlacements(count)`. Left block then
  right, half a spacing out of phase, running one screen spacing past the end of the
  drive. Pure and fixed — no randomness (`SDS-001`).
- `lot/art.ts` + tests — `ART_EXTENSION = "png"` (DT14's raster set; the SVG fallback was
  not taken), `ART_FILES`, `artUrls(base)`.
- `build-lot.ts` — one masked plane per placement inside the world (after the ground,
  before the screens); beam then car on the stage after the orb. No mask and no `<img>`
  here: those are the loader's (`SDS-006`).
- `lot-scene.ts` — the four sprites queued after the posters and in order, placed once
  resolved, released on `destroy()`; `MIN_CAR_PX = 640`; `LotSnapshot` gains `trees` and
  `car`.
- `global.css` — `.sds-tree`, `.sds-lot__car`, `.sds-lot__car-sprite`, the glows,
  `.sds-lot__beam` and all the narrow overrides. `tokens.css` — one new role,
  `--sds-tail-light`.

Confirmed on the served container at 1440×900, `?period=night`: **88 trees, all 88 masked
and visible**, the wagon `ready` with its sprite in a 547×308 box (16:9), computed
`pointer-events: none` on both car and beam, no `[sds]` warnings. The screenshot reads as
a drive-in — wagon bottom-centre with its tail-light glows, dashed lane, screens both
sides, trees on the verges.

## Commits

portfolio_site:
- `3a6fb1a` — `docs(session): DT15 blocked on DT11's unwritten decision row` (the gate
  report, before Evan's ruling; this file is that log, updated in place per the skill's
  "reuse it if the session continues")
- `91c7e6e` — `docs(dt11): decision record`
- `fb34174` — `feat(dt15): trees, the visitor's wagon and headlight beam; art declared
  through the loader`
- _this commit_ — `docs(session): DT15 shipped under DT11's GO ruling`

## Uncommitted work left behind

None.

## Verification

Everything below was run and passed unless marked otherwise.

- `pnpm format:check` — pass ("All matched files use Prettier code style!"). The
  pre-commit hook's own format-check also passed on `fb34174`.
- `pnpm -C theater typecheck` — pass. Caught two real things on the way: the repo runs
  `noUncheckedIndexedAccess`, so the jitter lookup needed a named fallback rather than a
  non-null assertion (`src` contains no `!` assertions anywhere — matched the house `??`
  style), and a `compareDocumentPosition` bitmask assertion was replaced with
  `nextElementSibling`.
- `pnpm -C theater lint` — pass.
- `pnpm -C theater test` — pass, **402 tests over 24 files**.
- `(cd theater && ./node_modules/.bin/vitest run --reporter=verbose src/lot) >
  /tmp/dt15-vitest.log 2>&1; vitest_status=$?` — **exit 0**, 73 passing cases in `src/lot`.
  Status captured rather than piped, per the phase's warning about `head`'s exit code.
- Grep guards, all as specified: `import.meta` outside `lot-scene.ts` → exit 1;
  `artUrls(import.meta.env.BASE_URL)` → exactly 1; `Math.random` → exit 1;
  `getBoundingClientRect|offsetHeight|offsetWidth` → exit 1; `bottom: 42%` → exit 1;
  `visibility: hidden` → present; `aspect-ratio: 16 / 9` → present;
  `awk '/^\.sds-lot__car \{$/,/^\}/' | grep -c 'pointer-events: none'` → 1; same for
  `.sds-lot__beam` → 1; `ART_EXTENSION: ArtExtension = "png` → present.
- `pnpm -C theater build` — pass; `dist/art/` holds all four PNGs unhashed.
- `docker compose build && docker compose up -d --force-recreate` — pass.
- Served: `/theater/` → 200, and `car.png`, `tree-1.png`, `tree-2.png`, `tree-3.png` all
  → 200.
- **Scripted browser look** (throwaway Playwright script, never committed, run from the
  workspace so `@playwright/test` resolves): the DOM/computed-style report quoted under
  Accomplished, plus two screenshots at different scroll positions.
- **E2E, not required by the phase and run anyway**: `click-through.spec.ts`,
  `keyboard.spec.ts`, `reveal.spec.ts` — **27 passed**, including all 20 screens'
  click-through with the car on the stage. Adding stage elements is exactly what could
  break hit-testing, so a regression there would have been this phase's, not DT16's.
- `python3 ../infra/scripts/session-logs/fold_back_audit.py docs/session-logs/` — pass at
  session start; `needs_decision=0`.
- **Not run:** the rest of the e2e suite, the parity script, the per-period and
  per-viewport wireframe comparison — all DT16's.

## Blockers

None remaining. The one that stopped the session — DT11's unwritten decision row — was
resolved by Evan's ruling rather than by measurement, which is recorded as such in the
decision row's footnote and repeated under Open flags.

## Open flags

- **`GO` is a ruling, not a measurement, and DT16 now carries weight it was not designed
  to carry alone.** DT11's procedure was never run: no harness walk over the five
  variants, no natural-wheel DevTools runs, no `posters resident: 20/20` gate, no
  `?selftest=verdict`, no tree-paint or click/Tab gate, no `masksrc=svg` smoke. None of
  its numeric thresholds (`scenery >= 50`, `scenery-overload < scenery`) has been
  evaluated. The probe still exists and is self-tested (`bcdc561`), so the measurement can
  be taken at any time and the row amended. If DT16 finds the lot slow, the fallbacks are
  DT11's own and the change is one constant: `TREE_SPACING = SPACING` (the `GO-REDUCED`
  layout, 44 trees instead of 88), or the car-only branch. `scenery.ts`'s docblock and
  `scenery.test.ts`'s constants assertion both name this so the next reader finds it.
- **DT14 also ran ahead of the same gate** and nothing caught it — its phase text
  evidently does not state the empty-row stop that DT15's does, which is why three tree
  sprites shipped at `df76193` against an unwritten row. Harmless under `GO`; it would
  have been dead weight under `NO-GO-TREES`.
- **One token was added outside DT13's scope, deliberately.** The phase lists token
  changes as out of scope, but the wireframe spells the tail-light glow as a literal
  `rgba(255, 70, 60, 0.55)` and `global.css` may never spell a colour (`EVO-UNI-001`, the
  rule DT13 added `--sds-road-surface` for). `--sds-tail-light` is in the base block only
  — **no period block was touched** — because a lamp on the car emits the same red at
  every hour and `--sds-headlight` already carries how much of it reads against the sky.
- **Comments can trip the phase's own grep guards, and two of mine did.** The first pass
  wrote "no `import.meta`" and "WHY A FIXED JITTER TABLE AND NOT `Math.random()`" in
  prose, which failed the `exit=1` guards on both. Reworded rather than accepted: a guard a
  comment can trip is a guard that cannot catch a real violation, and DT16 runs the same
  two. Worth knowing that `grep -rn 'import.meta' theater/src/lot/ --include='*.ts'`
  covers test files too, so the string is now banned from every file in `lot/` except
  `lot-scene.ts`.
- **`artUrls` is resolved once into a field** rather than called in both `load()` and
  `destroy()`. The phase's verification expects exactly one call site; a field also makes
  "release exactly what was declared" structural instead of a matching pair a later edit
  could put out of step.
- Trees read sparse at 1440×900 — two or three in frame at a time, because the line
  stands at ±900px against a 900px perspective. That matches the geometry as specified and
  is the wireframe's own composition, but it is the kind of thing that reads as "the trees
  did not load" to someone who has not compared them. DT16's comparison is where that gets
  settled.

## Rules-index candidates

- **A phase gated on a measurement states the not-yet-measured case as an explicit stop,
  alongside the failure verdicts.** Enumerating only `NO-GO-*` / `INVALID` leaves "the row
  is empty" unhandled, and an executing session then infers a verdict from downstream
  artefacts (committed art, a sibling phase that already ran) rather than from the
  measurement. DT15's branch named the empty row and stopped; DT14's evidently did not and
  shipped tree sprites against an unwritten row.
  `promote → universal`
- **When a decision row records a ruling rather than a measurement, the measurement cells
  say `not taken` and a footnote names what was never run.** A row filled in with plausible
  numbers, or left ambiguous, is indistinguishable later from one that was actually
  measured — and every downstream phase that trusted it inherits a premise nobody can
  audit. The cost of saying so is one footnote; the cost of not saying so is discovering
  it from a performance bug.
  `promote → universal`
- **A source comment must not contain the string a verification grep is asserting the
  absence of.** Prose explaining *why* a construct is banned ("not `Math.random()`") fails
  the guard that bans it, and the usual repair — loosening the grep to skip comments —
  makes it weaker than the thing it replaced. Reword the comment.
  `promote → tooling`

## Meta-prompt / skill / doc updates

- APPLIED: DT11's decision row, written as a ruling with `not taken` measurement cells and
  a provenance footnote → `docs/roadmaps/drive-in-theme-roadmap.md` (see Commits:
  `91c7e6e`)
- NO-CHANGE: `docs/roadmaps/drive-in-theme-roadmap.md` § DT15 — the phase executed end to
  end as written. Its `<branch>` gate is decidable and stopped the phase correctly; the
  `<constraints>` were precise enough that every literal, class name and property matched
  first time; the `<verification>` block's warning about `head` swallowing exit status was
  correct and needed.
- NO-CHANGE: `.claude/skills/rebuild-restart/SKILL.md` — followed for the container
  rebuild, including `--force-recreate` and polling for 200. Served as written.
- NO-CHANGE: `AGENTS.md`, `.claude/skills/writing-session-logs/SKILL.md` — read as the
  phase directs; nothing unclear.
- REJECTED (decided-by: human): [2026-09-09] **recorded closed.** DT11 ruled `GO`
  (`91c7e6e`), the sprites are in use, and the roadmap completed at DT16 (`3d3bade`), so
  amending DT14's branch block now changes nothing that will ever execute. The reusable
  half is not the phase text but the authoring lesson — a phase gated on a decision row
  must state its own stop condition, or the gate lives only in the *next* phase and the
  gated work ships ahead of it, which is exactly what happened here. That belongs in a
  roadmap-authoring rule rather than in a closed phase's body; raised as a rules-index
  candidate in the DT16 session log rather than applied here.

## Next steps

1. **DT16** — the browser proof: Playwright specs, the parity script, and the per-period,
   per-viewport comparison against the wireframe. It is now the first and only evidence
   that the trees and car are performant and do not steal a click, so treat its
   click-through falsification and its computed `pointer-events` assertions as
   load-bearing rather than confirmatory.
2. Optionally, take DT11's actual measurement and amend the decision row — the probe and
   the art checker are still there and still self-tested.
3. If DT16 reports the lot slow: `TREE_SPACING = SPACING` in `lot/scenery.ts` and the
   `GO-REDUCED` literals in `scenery.test.ts`. Nothing else changes.

## Pointers

- Roadmap: `docs/roadmaps/drive-in-theme-roadmap.md` — DT11 (its Manual Verification is
  still unrun), the decision table and its DT15 footnote, DT15, DT16.
- Spec: `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md` § "Scenery".
- Wireframe: `docs/wireframes/theater-drive-in-theme.html`.
- Probe and checker, still unrun: `docs/spikes/2026-09-08-scenery-probe.html`,
  `docs/spikes/art-check.html`.
- Prior logs: `2026-09-08-19-33-claude-code-dt11-scenery-falsifier-and-art-checker.md`,
  `2026-09-09-09-45-claude-code-dt13-palettes-orb-road-ground.md`,
  `2026-09-09-13-12-claude-code-dt14-sprites-via-codex.md`.
