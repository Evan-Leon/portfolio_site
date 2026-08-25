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

Not done (out of scope, DT6): the Playwright suite. The three manual browser
behaviours in the phase's verification block were **not** performed — no browser
was driven this session. What was checked instead is listed under Verification.

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
- **Mutation check** (`EVO-UNI-061`): reverting the frame loop to
  `REDUCED_MOTION_STEPS` and deleting the reduced-motion guard in `lot-scene.ts`
  fails exactly the three new behaviour tests and nothing else (3 failed / 292
  passed); both mutations reverted and the suite re-run green.

## Blockers

None.

## Open flags

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

- Phase DT6: the Playwright suite, which is where the three manual behaviours in
  DT5's verification block (Tab drives screen to screen; reduced motion snaps to
  nine positions with no video; `< 768px` lines the lot up single-file) get
  proven in a real Chromium. They remain unverified until then.

## Pointers

- `docs/roadmaps/drive-in-theater-roadmap.md` — Phase DT5 (the spec executed
  here), Phase DT6 (next).
- `theater/skills/rules-index/SKILL.md` — `SDS-002`, `SDS-004`, `SDS-005`.
- No handoff written.
