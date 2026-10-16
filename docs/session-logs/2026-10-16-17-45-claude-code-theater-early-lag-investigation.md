---
date: 2026-10-16
headline: Theater lag cut: draw distance, pre-warmed approach, wheel glide
agent: claude-code
type: feature
mode: attended
phases: []
repos: [portfolio_site]
---

## Accomplished
Investigated Evan's report that the theater lags from the gate until about chunk-norris (screen 5 of 20), then fixed it on Evan's go-ahead.

- Frame time depends on scroll position, not on loading: during a full drive it falls steadily from ~70ms at the gate to ~30ms at the exit. The probe saw no long tasks after the first step, and clips stream one at a time as each screen activates (`preload="none"`).
- Cause: at the gate, all 20 screens and all 88 masked tree planes are in front of the camera. Each screen carries a `filter: brightness()`, three `box-shadow`s, a `drop-shadow` bulb row and a `<video>`, and each tree is masked, so the compositor pays for all of them every frame. Screens and trees drop out once the camera passes them, so the cost goes down as you drive. By around screen 5 it fits a real GPU's frame budget.
- A/B at the gate (headed Chromium, 1440×900, `?period=afternoon`): hiding everything more than ~5 spacings ahead (78 of 108 screens and trees) took the mean frame from 56.6/57.1ms (two baseline runs) to 32.4ms. Hiding everything past 3 spacings gave 31.1ms.
- Fix landed: a draw distance. Each screen and tree gets a timeline-tweened `--sds-draw`, 0 beyond `DRAW_DISTANCE` (5 spacings) and ramping to 1 over `DRAW_FADE` (1 spacing). The stylesheet reads it as `opacity`. `visibility` was ruled out: the trees' `visibility` is their mask gate, and a hidden screen link would leave the tab order. The values are exposed in `LotSnapshot` (`screenDraw`, `treeDraw`), so the conformance kit's order-independence sweep covers them (`SDS-001`).
- After the fix, measured while actually driving (headed, software GL): ~34ms/frame flat at three points along the lot, against ~60/60/50ms with everything drawn.
- Evan then reported the approach (title → lot) still laggy. Cause: the lot is off screen until then, so the browser rasterised the whole ground plane mid-scroll. That was 434ms of raster during the approach, ~390ms of it the ground's (eleven background layers over 4000×5200; the flower grids ≈160ms and the turf ≈65ms of it). Paint complexity rather than area: a plain-gradient ground has the same tile count but 86ms of raster.
- Fix landed: `theater/src/page/prewarm.ts` wraps the loading ring. `dismiss()` holds each pin in the viewport (the engine's `--fixed` class) behind the opaque ring for 10 frames, puts it back, then reveals. Approach raster went to ~100ms (three runs) and approach frames to ~37ms mean.
- Ruled out a "treadmill" ground: the depth-wise fades and the incommensurate flower pitches would visibly jump.
- Evan then reported the approach as "shaky, not laggy": surging speed, on a notched mouse wheel (asked). Cause: Lenis smooths each wheel click once, so speed steps at every click. There is no motion blur anywhere in the theater, and scroll positions are whole pixels (checked at DPR 1/1.25/1.5).
- Fix landed: `theater/src/engine/wheel-smoothing.ts`, a first smoothing stage in front of Lenis. Wheel events are claimed through Lenis's `virtualScroll` hook, and the smoothed target goes to Lenis's non-programmatic `scrollTo`, so Lenis's easing becomes stage two. Modelled: per-click swing ±12% → ±2–3%, settle ~940 → ~780ms. Lowering a single `lerp` was strictly worse (0.06 gives ±7% and a 1.7s settle).
- Found, not fixed: during the drive the screens re-rasterise continuously (804 raster tasks per window with them, 102 without), presumably because their projected scale and lit values change every frame.

## Commits
- portfolio_site `42433ee` perf(theater): two-stage wheel smoothing — a notched wheel glides, not surges
- portfolio_site `3701e67` docs(session-log): theater approach pre-warm (this log, third version)
- portfolio_site `5d25b71` perf(theater): pre-warm the lot behind the loading ring
- portfolio_site `d33174e` docs(session-log): theater early-lag fix landed (this log, second version)
- portfolio_site `c6ff835` perf(theater): draw distance — fade the lot in from five spacings ahead
- portfolio_site `33488bd` docs(session-log): theater early-lag investigation (this log, first version)

## Uncommitted work left behind
None. The probe scripts live in the session scratchpad only.

## Verification
- Drive probe: wheel-scrolled in 40 steps, recording rAF deltas per step. Ran; data above.
- Headless feature A/B (far screens, surface filter/shadow, bulb drop-shadow, trees, videos): ran. Too noisy to rank features individually.
- CDP LayerTree probe: produced no layer events in this headless mode, so it yielded nothing.
- Trace probe using `scrollTo`: the engine did not follow programmatic `scrollTo` (the active screen stayed 0), so that data was discarded.
- `pnpm theater:typecheck`, `pnpm theater:lint`: pass. `pnpm theater:test`: 434/434 pass. `pnpm theater:e2e`: 61/61 pass, keyboard tab-through included. `pnpm format:check` and the pre-commit hook: pass.
- Negative control (`EVO-UNI-061`): with `drawIn` stubbed to return early, both new build-lot tests fail; the code was then restored.
- Rebuilt the container. The served CSS contains `--sds-draw`, and in the served page screens 0–3 have computed opacity 1 and screens 4–19 have 0.
- A/B while driving (`moving.mjs`): draw distance ~34ms flat; with `opacity:1 !important` forced, 60/60/50ms. A first gate re-measure ran while the e2e suite was using the CPU and was discarded.
- The full-drive wheel probe's profile hardly changed after the fix. I don't trust it as a measure: it mixes in the pin approach and clip playback, and with software decode, clip playback alone is ~8ms/frame.
- Wheel smoothing: typecheck and lint pass. `pnpm theater:test`: 448/448 pass. `pnpm theater:e2e`: 61/61 pass. Format check and hook: pass. Negative control: with stage one bypassed, three of the 10 smoother tests fail, including the steady-glide one; code restored.
- Wheel A/B (`glide.mjs`, plain-Lenis bundle vs two-stage, served from the scratchpad, 3 alternating runs): steady max/min 2.96/2.48/2.57 vs 2.14/2.07/1.78; settle ~770 vs ~600ms; both travel exactly 3000px. Absolute ratios are inflated by irregular software frames.
- Pre-warm: typecheck and lint pass. `pnpm theater:test`: 438/438 pass. `pnpm theater:e2e`: 61/61 pass. Format check and hook: pass. Negative control: with the hold's class add removed, the hold test fails; code restored.
- Pre-warm feasibility (a cover div plus a fixed lot, injected): approach raster 434 → 77ms. Real flow after rebuild (`after-approach.mjs`): 101/93/102ms.
- Feature A/B for the drive (`feat.mjs`) and per-layer ground raster (`layersbg.mjs`): ran, numbers above.
- Console snippet for real-GPU timing given to Evan; not run yet.
- Headed A/B with distance cull: ran, baseline repeated twice. The WSLg GPU still reported `llvmpipe` (software), so absolute numbers are inflated. The relative ~43% drop is the evidence.

## Blockers
None.

## Open flags
- None of the measurements ran on a hardware GPU. Evan should confirm the feel on a real browser. If the far end of the lot looks too empty, or the lag persists, tune `DRAW_DISTANCE` in `theater/src/lot/geometry.ts`.
- The wheel smoothing changed the vendored engine (`engine.ts` plus a new module). If the engine is ever re-vendored from upstream, carry it over.
- The screens' continuous re-raster during the drive is the next cost centre if lag remains mid-drive.
- `global.css` has a comment saying masked trees "paint on the world's layer". They carry a 3D transform, so they may in fact be composited. Not verified, and not acted on.

## Rules-index candidates
None.

## Meta-prompt / skill / doc updates
- NO-CHANGE: theater-rules-index — checked `SDS-001`/`SDS-004`/`SDS-010` against the proposed cull; served as written

## Next steps
- Evan: check the theater at evanleon.com once it is deployed (Cloudflare caches assets for 4h) or at portfolio-site.localhost (already rebuilt).

## Pointers
None.
