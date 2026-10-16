---
date: 2026-10-16
headline: Theater's early lag traced to everything still ahead of the camera
agent: claude-code
type: debugging
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished
Investigated Evan's report that the theater lags from the gate until about chunk-norris (screen 5 of 20). Diagnosis only, no code changed.

- Frame time depends on scroll position, not on loading: during a full drive it falls steadily from ~70ms at the gate to ~30ms at the exit. The probe saw no long tasks after the first step, and clips stream one at a time as each screen activates (`preload="none"`).
- Cause: at the gate, all 20 screens and all 88 masked tree planes are in front of the camera. Each screen carries a `filter: brightness()`, three `box-shadow`s, a `drop-shadow` bulb row and a `<video>`, and each tree is masked, so the compositor pays for all of them every frame. Screens and trees drop out once the camera passes them, so the cost goes down as you drive. By around screen 5 it fits a real GPU's frame budget.
- A/B at the gate (headed Chromium, 1440×900, `?period=afternoon`): hiding everything more than ~5 spacings ahead (78 of 108 screens and trees) took the mean frame from 56.6/57.1ms (two baseline runs) to 32.4ms. Hiding everything past 3 spacings gave 31.1ms.
- Proposed fix (not implemented): draw-distance culling in the lot timeline. Fade, then `visibility: hidden`, any screen or tree more than N spacings ahead, as an absolute function of progress (`SDS-001`).

## Commits
None besides this log.

## Uncommitted work left behind
None. The probe scripts live in the session scratchpad only.

## Verification
- Drive probe: wheel-scrolled in 40 steps, recording rAF deltas per step. Ran; data above.
- Headless feature A/B (far screens, surface filter/shadow, bulb drop-shadow, trees, videos): ran. Too noisy to rank features individually.
- CDP LayerTree probe: produced no layer events in this headless mode, so it yielded nothing.
- Trace probe using `scrollTo`: the engine did not follow programmatic `scrollTo` (the active screen stayed 0), so that data was discarded.
- Headed A/B with distance cull: ran, baseline repeated twice. The WSLg GPU still reported `llvmpipe` (software), so absolute numbers are inflated. The relative ~43% drop is the evidence.

## Blockers
None.

## Open flags
- None of the measurements ran on a hardware GPU. Before tuning a cull distance, confirm on Evan's real browser (DevTools Performance panel at the gate vs. past chunk-norris).

## Rules-index candidates
None.

## Meta-prompt / skill / doc updates
- NO-CHANGE: theater-rules-index — checked `SDS-001`/`SDS-004`/`SDS-010` against the proposed cull; served as written

## Next steps
- If Evan approves: implement draw-distance culling for screens and trees in `theater/src/lot/build-lot.ts` (timeline-driven, `SDS-001`), add a conformance check, then re-run the drive probe.

## Pointers
None.
