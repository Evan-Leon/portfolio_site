---
date: 2026-08-25
agent: claude-code
type: phase-execution
phases: [DT5]
repos: [portfolio_site]
---

## Accomplished

Done — all four build-order steps of DT5.

- **Engine additions.** `EngineOptions.reducedMotionSteps?: number` defaults to
  the still-exported `REDUCED_MOTION_STEPS` and is read once per
  `createEngine`, replacing the constant at the single quantise call site in
  `update()`. `Engine.scrollToScene(sceneId, progress): boolean` computes
  `metrics.top + clamp01(progress) * metrics.length` from the mounted scene's
  cached metrics, writes the position through `Lenis.scrollTo` when Lenis is on
  and `scrollTo({ top, behavior: 'auto' })` otherwise, and returns `false`
  without scrolling before `start()` or for an unknown id. No layout read was
  added (`SDS-004`) and no `scroll` listener (`SDS-005`).
- **Theater wiring.** `main.ts` passes `reducedMotionSteps: projects.length + 1`
  (9) and hangs one delegated `focusin` on the mount root: target inside
  `.sds-screen`, `:focus-visible`, `data-screen-index` read, then
  `scrollToScene('lot', screenProgress(i, 8) + BAND_SETTLE)` with
  `BAND_SETTLE = 0.02`. The adapter still holds no engine reference (`SDS-002`).
- **Reduced-motion clips.** `lot-scene.ts` imports `REDUCED_MOTION_QUERY` from
  `engine.ts` (`EVO-UNI-057`) and evaluates it per activation; under the
  preference it pauses the departing screen and returns before `play()`, so the
  poster holds and `snapshot().playing` stays `null`.
- **Narrow layout.** `build-lot.ts` writes `--sds-screen-x` / `--sds-screen-z` /
  `--sds-screen-yaw` instead of an inline `transform`; `.sds-screen` in
  `global.css` composes them; the existing `@media (max-width: 767px)` block
  restates x and yaw as `0px`/`0deg` with `!important` (inline declarations
  otherwise outrank every stylesheet rule) alongside the 300px width.

Attempted and abandoned: nothing.

Also done, after the DT5 commit: the phase's three manual browser behaviours,
driven in a real headless Chromium via an ad-hoc Playwright script (scratch
only — the committed suite is DT6's deliverable, and nothing was added to
`theater/e2e/`). All three hold; numbers under Verification.

Not done (out of scope, DT6): the committed Playwright suite.

## Commits

portfolio_site:

- `f1c49b6` — feat(dt5): keyboard drive-by-focus, reducedMotionSteps engine option, narrow single-file lot
- (this log, committed separately)

## Uncommitted work left behind

`images/chunk-norris/` — untracked, pre-existing at session start, unrelated to
DT5 and deliberately left alone.

## Verification

All run from the repo root, all passing unless noted.

- `pnpm -C theater typecheck` — pass.
- `pnpm -C theater lint` — pass.
- `pnpm -C theater test` — pass, 21 files / 295 tests (was 290).
- `pnpm -C theater build` — pass (`tsc --noEmit && vite build`).
- `pnpm format:check` — pass; pre-commit hook's scoped Prettier check also passed.
- `docker compose build && docker compose up -d --force-recreate` — pass;
  container Up.
- Served-artefact checks against `Host: portfolio-site.localhost`: `/`,
  `/theater/`, `/projects/classic-golf.html`, `/assets/css/styles.css` all 200;
  the served theater CSS carries `var(--sds-screen-x` and
  `--sds-screen-x:0px!important` inside the minified `@media (width<=767px)`
  block; the served JS carries `focusin`, `focus-visible` and `scrollToScene`.
- EVO-UNI-014 greps before changing either symbol: `createEngine(` has exactly
  one non-test call site (`main.ts`); `REDUCED_MOTION_STEPS` appeared in
  `engine.ts` ×2 and `engine.test.ts` ×2; `scrollToScene` was unused, while
  `scrollToSceneProgress` exists in `e2e/helpers/app.ts:130` — the collision the
  phase named, avoided by the chosen name.
- `grep -n scrollIntoView theater/src/main.ts theater/src/lot/*.ts` — no hits
  (exit 1), so `EVO-FE-219` never applies.
- **The three manual browser behaviours**, headless Chromium against
  `vite preview` on 4173 (the production `dist/`, with the repo's
  `vite-site-assets` plugin serving the site's real posters). Lot spacer
  top 800, length 7680 at a 1280×800 viewport.
  - *Keyboard.* Tab 1 → `.sds-skip`, Tab 2 → `.sds-chrome__logo`, Tab 3 →
    screen 0 (page drives to scrollY 952 against a computed target of 954,
    `--sds-screen-lit` = 1), Tab 4 → screen 1 (1805 against 1807, lit = 1).
    The 2px gap is Lenis settling, and is a quarter of a percent of an 853px
    band. Note the phase text says "Tab → skip link, Tab → screen 1"; there is
    a chrome logo link between them, so it is three presses, not two.
  - *Reduced motion.* 61 scroll samples across the drive produce exactly **10**
    distinct world-Z positions — `0, 800, …, 7200`, one per screen plus the
    exit, which is `reducedMotionSteps: 9` doing precisely what it was set to
    do. The control at `reducedMotion: 'no-preference'` produces 61 distinct
    positions from the same samples (`EVO-UNI-061`).
  - *Reduced motion, video.* Because no clips exist on disk until DT9, the run
    fulfils `**/demo.mp4` from a real ffmpeg-generated H.264 file, so "nothing
    plays" is a statement about behaviour rather than about a 404. Under
    `reduce`: 8 video elements on the page, `play` fired for **zero** screens.
    Under `no-preference`, same sweep: `play` fired for screens 1–7.
  - *Narrow.* At a 375px viewport every screen computes to `x = 0`, no Y
    rotation, `width: 300px`, and `z = -(i + 1) × 800` — single file down the
    lane, with the drive untouched. The page still drives: scrolling to the
    middle of the lot moves world-Z 0 → 3600 and the chrome readout to 50%.
- **Mutation check** (`EVO-UNI-061`): reverting the frame loop to
  `REDUCED_MOTION_STEPS` and deleting the reduced-motion guard in `lot-scene.ts`
  fails exactly the three new behaviour tests and nothing else (3 failed / 292
  passed); both mutations reverted and the suite re-run green.

## Blockers

None.

## Open flags

- **DT4 defect found by DT5's browser run: screen 0's clip never plays on the
  first approach.** Probed and confirmed — driving into screen 0, then 1, then
  2 fires `play` for 1 and 2 only; driving back to 1 and then 0 fires both, so
  screen 0 plays only on a *return* visit. Mechanism: `buildLot` runs inside the
  GSAP timeline builder, which cannot run until `load()` has dynamically
  imported GSAP — but the engine's `updateAll()` during `start()` seeks the
  adapter before that resolves. At scrollY 0 the clamped progress is 0, so
  `activeScreen` is 0 and `#active` is set to 0 while `#video(0)` is still
  `null`. By the time the DOM exists, `#active` is already 0, so no activation
  ever fires on the way in. Invisible to `lot-scene.test.ts`, which awaits
  `load()` before its first `seek`. Not introduced by DT5 (the reduced-motion
  early return is below the pause and the probe ran at `no-preference`) and not
  fixed here — it is DT4's contract. The likely fix is re-firing the activation
  for the current `#active` once `load()` has built the DOM, with a test that
  seeks *before* `load()` resolves.
- **The `focusin` handler has no automated test.** It lives in `main.ts`, which
  no unit test imports, and DT5 scopes its tests to the engine and the adapter.
  Its logic — `:focus-visible`, the index parse, `BAND_SETTLE` — is proven only
  by DT6's browser suite. That is the phase's design, not an oversight, but it
  means a regression there is currently silent.
- **The `!important` pair in the narrow block is load-bearing and deletable.**
  Removing it restores the wide slalom on phones with nothing erroring and no
  test failing (jsdom has no cascade to assert against). The comment above it
  states the mechanism; the nearest available guard is the new assertion that no
  screen carries an inline `transform` after scrubbing.
- **`lot-scene.ts` now imports `engine.ts`** for `REDUCED_MOTION_QUERY`, which
  pulls Lenis into the lot module's import graph. Harmless today — `main.ts`
  already imports both and the bundle is unchanged in shape — but it is a new
  edge from a scene to the engine, and the engine's own constant module would be
  the cleaner home if a second scene ever needs it.
- Lightning CSS emits the breakpoint as `@media (width<=767px)`. Pre-existing
  output, noted only so a future grep for `max-width` in `dist/` does not read
  as the block having vanished.

## Rules-index candidates

- Placement a breakpoint has to override belongs in custom properties, and the
  override needs `!important`. Per-element arithmetic is written inline, and an
  inline declaration outranks every stylesheet rule regardless of media query or
  specificity — so moving from an inline `transform` to inline custom properties
  buys nothing on its own. The failure is silent and appears only at the
  breakpoint. Pin it with a test that the element carries no inline copy of the
  composed property. promote → react-frontend

## Meta-prompt / skill / doc updates

- **DT5's phase text was accurate and complete** — the contract named exact
  symbols, the `scrollToSceneProgress` collision was called out in advance with
  its line number, and the constraint that the media query "can override
  `--sds-screen-x: 0`" was right in spirit. One thing it did not say: that the
  override needs `!important`, because `build-lot.ts` writes the properties
  inline. The roadmap's DT5 constraint bullet would be stronger with that clause
  added — an implementer following it literally would ship a narrow layout that
  silently never applies.
- `writing-session-logs`, `rebuild-restart`, `theater/skills/rules-index` — all
  served the task as written.

## Next steps

- Fix the screen-0 first-approach clip bug under Open flags, with a regression
  test that seeks before `load()` resolves. It is a small change to
  `lot-scene.ts` and wants its own commit against DT4's contract.
- Phase DT6: the committed Playwright suite. The three behaviours are already
  proven ad-hoc (see Verification); DT6 turns that into a standing net, and the
  ten-position reduced-motion assertion and the served-clip route are both worth
  carrying over.

## Pointers

- `docs/roadmaps/drive-in-theater-roadmap.md` — Phase DT5 (the spec executed
  here), Phase DT6 (next).
- `theater/skills/rules-index/SKILL.md` — `SDS-002`, `SDS-004`, `SDS-005`.
- No handoff written.
