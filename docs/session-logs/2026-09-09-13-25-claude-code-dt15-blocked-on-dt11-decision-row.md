---
date: 2026-09-09
agent: claude-code
type: phase-execution
mode: attended
phases: [DT15]
repos: [portfolio_site]
---

## Accomplished

**Nothing was built — DT15 stopped at its own entry gate, correctly.** The phase's
`<branch>` block requires a verdict in the roadmap's Decision records table before any
code is written; the DT11 row is still the placeholder `| DT11 | _not yet run_ | ... |`
(`docs/roadmaps/drive-in-theme-roadmap.md:1346`), and the branch says: *"If DT11 says
`NO-GO-ALL` or `INVALID`, or the row is empty → stop; this phase does not run."*

Attempted and abandoned at the gate: writing `scenery.ts`, `art.ts`, the `buildLot` tree/
car/beam DOM, the `lot-scene.ts` art declarations and the `global.css` rules. None of it
was started, so the working tree is clean apart from this log.

What the gate check established, all verified against the codebase rather than the
roadmap's prose:

- `theater/public/art/` holds `car.png`, `tree-1.png`, `tree-2.png`, `tree-3.png` — so
  `ART_EXTENSION` would be `'png'`, and DT14 shipping three tree sprites means DT14 was
  *not* executed on the `NO-GO-TREES` branch. That is a strong hint the verdict was `GO`
  or `GO-REDUCED`, but a hint is not the decision row, and it does not separate the two:
  `GO` → `TREE_SPACING = 400`, `GO-REDUCED` → `800`, and **every literal in
  `scenery.test.ts` differs between them** (`treePlacements(8).length` is 40 vs 20;
  `[19].z` is -7700 vs -7300; the first right tree is index 20 vs 10). Guessing wrong
  produces a green suite asserting the wrong layout.
- Both DT11 artefacts exist and are committed: `docs/spikes/2026-09-08-scenery-probe.html`
  (95 KB) and `docs/spikes/art-check.html` (44 KB). The measurement, not the tooling, is
  what is missing.

## Commits

portfolio_site:
- _this commit_ — `docs(session): DT15 blocked on DT11's unwritten decision row`

## Uncommitted work left behind

None.

## Verification

- `ls theater/public/art/` — pass; four PNGs (`car`, `tree-1`, `tree-2`, `tree-3`).
- `grep -nE '^\| DT11 \|' docs/roadmaps/drive-in-theme-roadmap.md` — pass (ran); returns
  the roadmap's phase-list row at :58 and the decision row at :1346, whose Decision cell
  is `_not yet run_` and whose ten measurement cells are all empty.
- `grep -E '^\| DT11 \| (GO|GO-REDUCED|NO-GO-TREES|NO-GO-ALL|INVALID) \|'
  docs/roadmaps/drive-in-theme-roadmap.md` — **no match**, which is DT11's own
  "nothing yet" expectation still holding one phase later than it should.
- `ls docs/spikes/2026-09-08-scenery-probe.html docs/spikes/art-check.html` — pass.
- `python3 ../infra/scripts/session-logs/fold_back_audit.py docs/session-logs/` — pass;
  `needs_decision=0`, no `STALE_NEEDS_DECISION` to clear. One pre-existing
  `APPLIED_NO_COMMIT` finding on the 2026-09-08 roadmap log (line 69) about memory files
  written outside git — not this session's, not actionable here.
- **Skipped, all of them, because no code was written:** `pnpm format:check`,
  `pnpm -C theater typecheck`, `pnpm -C theater lint`, `pnpm -C theater test`, the
  verbose `vitest run src/lot` capture, every DT15 grep guard, `pnpm -C theater build`,
  `docker compose build`, the served `curl` for the car sprite, and the manual
  night-viewport look.

## Blockers

**DT15 cannot start until Evan measures DT11 and writes the decision row.** The verdict
is not a formality that can be inferred or assumed — it is a fan-out that reaches every
file in the phase:

| Verdict | What DT15 becomes |
|---|---|
| `GO` | `TREE_SPACING = SPACING / 2` (400); the 40/88-tree literals |
| `GO-REDUCED` | `TREE_SPACING = SPACING` (800); the 20/44-tree literals; deviation from the wireframe's density noted in the log |
| `NO-GO-TREES` | `scenery.ts` is never written; `build-lot.ts` exports four constants instead of ten; `load()` queues one art URL instead of four; no `.sds-tree` CSS; the car-only test set |
| `NO-GO-ALL` / `INVALID` / empty | The phase does not run |

To unblock, per DT11's Manual Verification (Chromium, 1440×900, mains power, no other
media playing):

1. Confirm the probe's gates first: header shows `posters resident: 20/20`, and
   `?selftest=verdict` printed all-match — the probe refuses a verdict otherwise.
2. Harness run (relative cost only, decides density):
   `file:///home/evan/EVOsystem/portfolio_site/docs/spikes/2026-09-08-scenery-probe.html?variant=lot20&measure=all&reset=1`
3. Natural-wheel run (owns every absolute `≥ 50`): DevTools performance panel, real wheel
   scrolling, `?variant=car-only` and the scenery variant about to be selected.
4. By hand in `?variant=scenery`: trees visible both sides; click screen 3 → opens
   `projects/classic-golf.html`; Tab walks the screens in order. Repeat in `?variant=car-only`.
   If heading for GO-REDUCED, repeat both in `?variant=scenery-half`.
5. Under GO or GO-REDUCED: `?variant=scenery&masksrc=svg` once — trees paint, fps within noise.
6. Apply the header's ordered procedure, write the row, commit `docs(dt11): decision record`.

## Open flags

- **DT14 ran ahead of its own gate and nothing caught it.** DT14's art phase is gated on
  the same decision row (the roadmap has it produce the car *only* under `NO-GO-TREES`),
  yet three tree sprites shipped at `df76193` on 2026-09-09 with the row still unwritten.
  The sprites are very likely right — but they were produced against an assumed verdict,
  and if DT11 ever measures `NO-GO-TREES` they are dead weight committed to the repo.
  Worth a line in DT11's decision row noting the art already exists.
- The gate held here only because DT15's `<branch>` names the empty-row case explicitly.
  DT14's phase text apparently did not, which is why it ran. If more phases are added,
  the empty-row stop belongs in each one's branch block, not just this one's.
- `docs/session-logs/` now holds raw logs from 2026-09-08 and 2026-09-09 only — under the
  3-distinct-completed-days threshold, so no sweep nudge yet.

## Rules-index candidates

- **A phase gated on a measurement states the not-yet-measured case as an explicit stop,
  alongside the failure verdicts.** Enumerating only `NO-GO-*` / `INVALID` leaves "the
  row is empty" unhandled, and an executing session then infers a verdict from downstream
  artefacts (committed art, a sibling phase that already ran) rather than from the
  measurement. DT15's branch names the empty row and stopped; DT14's evidently did not
  and shipped tree sprites against an unwritten row.
  `promote → universal`

## Meta-prompt / skill / doc updates

- NO-CHANGE: `docs/roadmaps/drive-in-theme-roadmap.md` § DT15 `<branch>` — the gate was
  checked against the live table and the art directory; it is decidable, names the empty
  row, and stopped the phase exactly as intended. Served as written.
- NO-CHANGE: `.claude/skills/rebuild-restart/SKILL.md`, `.claude/skills/writing-session-logs/SKILL.md`,
  `AGENTS.md` — read as the phase directs; nothing unclear, nothing to fold back.
- PENDING (decided-by: human): DT14's phase text does not appear to state the empty-row
  stop that DT15's does, which is the likely reason the tree sprites shipped ahead of the
  decision row — a phase-text change to a roadmap under active execution is a DEFER, not
  a mechanical fix; next action: Evan rules on whether to amend DT14's branch block (or
  record it closed as water-under-the-bridge once DT11 measures GO / GO-REDUCED).

## Next steps

1. Evan runs DT11's Manual Verification and commits `docs(dt11): decision record`.
2. Re-enter DT15 with the verdict in hand; the branch selects `TREE_SPACING` and the test
   literals, and the phase runs end to end from step 1 of its build order.
3. DT16 proves it in a browser.

## Pointers

- Roadmap: `docs/roadmaps/drive-in-theme-roadmap.md` — DT11 (lines 110–320), its decision
  table (line 1337 onward), DT15 (918–1130).
- Probe and checker: `docs/spikes/2026-09-08-scenery-probe.html`, `docs/spikes/art-check.html`.
- Spec: `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`.
- Prior logs: `2026-09-08-19-33-claude-code-dt11-scenery-falsifier-and-art-checker.md`
  (built the probe; its own Next steps hand the measurement to Evan),
  `2026-09-09-13-12-claude-code-dt14-sprites-via-codex.md`.
