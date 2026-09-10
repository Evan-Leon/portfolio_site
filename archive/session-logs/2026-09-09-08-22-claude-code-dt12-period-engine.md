---
date: 2026-09-09
agent: claude-code
type: phase-execution
mode: attended
phases: [DT12]
repos: [portfolio_site]
---

## Accomplished

DT12 executed and committed in full.

- **Done** — `theater/src/page/period.ts`: the six periods, `PERIOD_ATTRIBUTE`,
  `PERIOD_PARAM`, `periodForHour` (throws `RangeError` off an integer 0–23),
  `getPeriod` (delegates the bands, holds none), `periodFromSearch`
  (`URLSearchParams`, `EVO-FE-183`), `applyPeriod`, `installPeriod` returning an
  uninstaller. Ported from jourNOW's `utils/timePeriod.ts` with its
  module-level `document`/`new Date()` reads replaced by parameters, which is
  what makes the clock movable in jsdom without stubbing globals.
- **Done** — `period.test.ts`: 48 assertions, including all 24 hours against
  literal period names (a table, not a loop over the bands).
- **Done** — `main.ts` installs on `document.documentElement` before
  `createEngine`, return value dropped.
- **Done** — the e2e pin: `PINNED_PERIOD`, `APP_URL`, `periodAttribute` in
  `e2e/helpers/app.ts`; `openPage` and `reveal.spec.ts`'s two direct `goto`s now
  use `APP_URL`; `APP_PATH` unchanged for `nginx-parity.sh` and for
  `period.spec.ts`, the one deliberately unpinned spec.
- **Done** — `e2e/period.spec.ts`: 10 tests (six overrides, unknown-override
  fallback, unpinned clock, the `visibilitychange` catch-up, and the pinned page
  refusing to catch up), every assertion an `expect.poll` (`EVO-TOOL-071`).
- **Done** — the `EVO-UNI-061` falsification, run and restored.

Nothing visible changed: `data-period` styles nothing until DT13.

## Commits

- portfolio_site `458e1e7` — feat(dt12): time-of-day period engine with
  `?period=` override; e2e pinned to night

## Uncommitted work left behind

None. Working tree clean.

## Verification

Every command run from `theater/` unless noted, all binaries resolved directly
per the roadmap's measured `pnpm exec` defect.

- `./node_modules/.bin/tsc --noEmit` — pass
- `./node_modules/.bin/eslint .` — pass
- `./node_modules/.bin/vitest run` — pass, 22 files / 368 tests (369 after the
  final formatting pass; 48 of them new)
- `./node_modules/.bin/vitest run --reporter=verbose src/page` — exit 0,
  captured to a file and the status checked before rendering the glyphs (the
  roadmap's measured `| head` defect)
- `./node_modules/.bin/playwright test` — pass, 40 tests, with the pin in place
- `pnpm -C theater build` — exit 0
- `pnpm format` then `pnpm format:check` (repo root) — pass; pre-commit hook
  green on commit
- awk order guard (`installPeriod(document.documentElement` before
  `createEngine({`) — prints
- `grep -n "location.search.split\|indexOf('period')" src/page/period.ts` —
  exit 1
- `grep -n "APP_URL" e2e/helpers/app.ts e2e/reveal.spec.ts | wc -l` — 5 (≥ 4)
- `grep -n "goto(APP_PATH)"` over the helper and the five non-period specs —
  exit 1
- **Falsification (`EVO-UNI-061`)**: `periodForHour` renamed and replaced with a
  typed stub returning `"night"`; `tsc` still passed (the webServer builds
  before the run), and `playwright test period` exited **1** with exactly the
  two clock-fallback tests failing — `an unrecognised ?period= falls back to the
  clock` and `a tab left open across a band boundary catches up`; 8 passed. File
  restored by copy (`cmp` clean) and the same command exited **0**, 10 passed.

## Blockers

None.

## Open flags

- `page.clock.install()` was the roadmap's prescribed form and was expected to
  be a risk here — Playwright's fake clock also fakes `setTimeout` and
  `requestAnimationFrame`, which the loading ring and the engine's frame loop
  both depend on, so a paused clock would have hung `waitForReveal` for its full
  20 s. **Measured, not reasoned**: installed before `goto`, the clock keeps
  ticking and all four clock tests reveal in ~2–3 s. Worth knowing before DT13's
  unpinned daytime visit adds a fifth.
- `period.spec.ts` asserts only the attribute. Its six per-period tests are
  therefore near-duplicates today and only become distinguishable when DT13
  hangs a palette off each one — DT13 should extend them rather than add a
  parallel spec.
- The re-apply path is `visibilitychange` only, so a tab that stays focused
  across a band boundary keeps the old sky until the visitor leaves and returns.
  That is the ported jourNOW behaviour and deliberate (no timer, per the
  module's header); flagged because it is the first thing a reader will ask.

## Rules-index candidates

- **Fake-clock APIs that also fake timers can hang a page's own startup path.**
  Playwright's `page.clock.install()` replaces `Date`, `setTimeout` *and*
  `requestAnimationFrame`; a page whose reveal depends on a timer or a frame
  loop can therefore never finish loading under a paused fake clock, and the
  failure is a full-timeout hang on an assertion that looks unrelated to the
  clock. Before pinning time in an e2e spec, check whether the page's *startup*
  depends on the timers being faked, and prefer the narrow `setFixedTime` (Date
  only, timers untouched) when it does. Measured here: `install()` before `goto`
  left the clock ticking and the reveal worked, so this is a check to run, not a
  prohibition. `promote → tooling`
- **A module that exists to be stubbed in a falsification must not duplicate the
  logic it delegates.** `getPeriod` was required to hold no bands of its own
  precisely so that stubbing `periodForHour` breaks the clock path; the ported
  original inlines the bands, and had that been copied, the `EVO-UNI-061`
  falsification would have passed unchanged and reported coverage that did not
  exist. When a phase names the falsification up front, check that the seam it
  will cut is the only path to the behaviour. `promote → universal`

## Meta-prompt / skill / doc updates

- NO-CHANGE: `docs/roadmaps/drive-in-theme-roadmap.md` § Phase DT12 — every
  constraint, verification command and measured-defect warning was executable as
  written and matched the tree; the `pnpm exec` and `| head` warnings both
  earned their place, and the `git checkout --` → backup-by-copy note was
  required since `period.ts` was untracked at falsification time. Served as
  written.
- NO-CHANGE: `docs/roadmaps/drive-in-theme-roadmap.md` § Changelog — considered
  adding a DT12 row and did not. All four existing rows carry `—` in the Phase
  column and record roadmap-document revisions; DT11's execution (`bcdc561`)
  added none either, so a phase-execution row would be a new convention rather
  than an omission being fixed. Surfaced here rather than applied.
- NO-CHANGE: `AGENTS.md`, `theater/skills/rules-index/SKILL.md`,
  `.claude/skills/writing-session-logs/SKILL.md` — loaded and followed; nothing
  unclear, missing or wrong.

## Next steps

- DT13: sky, orb, lighting roles, road markings, geometry-sized ground and the
  six palettes — the phase that gives `data-period` something to do, and that
  extends `period.spec.ts` with the consumer assertions. Read its
  **⚠ MEASURED BEFORE YOU START** block on the ground-plane flicker first.
- DT11's decision row is still `_not yet run_`; DT14 onward is gated on it.
  DT13 is not.

## Pointers

- Roadmap: `docs/roadmaps/drive-in-theme-roadmap.md` § Phase DT12 (lines
  413–557); phase table at line 52.
- Spec: `docs/superpowers/specs/2026-09-08-drive-in-theme-design.md`.
- Source ported: `/home/evan/EVOsystem/jourNOW/frontend/src/utils/timePeriod.ts`.
- Prior session: `docs/session-logs/2026-09-08-19-33-claude-code-dt11-scenery-falsifier-and-art-checker.md`.
- No handoff written.
