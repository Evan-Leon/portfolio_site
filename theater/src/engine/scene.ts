/*
 * The scene lifecycle state machine.
 *
 * A page holds several scenes and only the ones near the viewport may hold
 * assets in memory — that bound is the whole reason this file exists. The
 * machine is a pure function of raw progress, so SD5 can drive it from the rAF
 * loop and this file never needs to know a scene exists as an element.
 *
 * `SceneDef` is deliberately NOT here. It carries an `AnimationAdapter`
 * factory, which does not exist until SD4, and typing it would drag
 * `HTMLElement` into this DOM-free layer. SD4 owns it.
 */

/**
 * How far outside its own span a scene stays mounted, in **raw-progress units,
 * not pixels**.
 *
 * `preload: 0.25` means the scene mounts and begins loading when raw progress
 * reaches `-0.25` — a quarter of its own length before it starts. `unload: 0.5`
 * means it stays mounted until raw progress reaches `1.5`, half a length past
 * its end.
 *
 * The consequence worth understanding: because the unit is a fraction of the
 * scene's own length, a longer scene preloads from further away **in pixels**.
 * That is intentional. A long scene is a big scene, and it needs the extra head
 * start; expressing the margin in pixels would give the heaviest scenes the
 * shortest runway.
 *
 * These are a **floor on asset runway, not the whole story**. They say nothing
 * about when the scene's pinned container can be seen, which is what actually
 * decides when an adapter must exist. Every engine call site therefore passes
 * these through {@link withPinVisibility} first — see that function for the
 * failure this separation exists to prevent.
 */
export interface SceneMargins {
  /** Raw progress before 0 at which the scene mounts. */
  preload: number;
  /** Raw progress past 1 at which the scene unmounts. */
  unload: number;
}

/**
 * The margins every scene uses unless it overrides them.
 *
 * Import this constant; never re-declare `{ preload: 0.25, unload: 0.5 }`
 * locally (`EVO-UNI-057`). A second copy is correct on the day it is written
 * and diverges silently afterwards.
 */
export const DEFAULT_MARGINS: SceneMargins = { preload: 0.25, unload: 0.5 };

/**
 * Widen `margins` so a scene is mounted for as long as its pinned container can
 * be seen.
 *
 * WHY THE DECLARED MARGINS ARE NOT ENOUGH ON THEIR OWN
 * ---------------------------------------------------
 * {@link SceneMargins} is a fraction of the scene's own **scrub length**. When
 * the pin becomes visible is a function of the **viewport height**. Those two
 * numbers are unrelated, and the second is routinely larger — so a scene's
 * pinned container can be on screen, taking up half the viewport, while its
 * adapter does not exist yet.
 *
 * The geometry, for a spacer whose top is at document position `T`:
 *
 * ```
 *   pin enters the viewport   scene scrubs    pin leaves the viewport
 *   scrollY = T - viewport                    scrollY = T + length + viewport
 *   raw     = -viewport/length                raw     = 1 + viewport/length
 * ```
 *
 * So visibility demands a margin of `viewport / length` on **both** sides, and
 * the effective margin is whichever of the two is larger.
 *
 * WHAT IT LOOKED LIKE WITHOUT THIS
 * --------------------------------
 * Measured on the real page at a 720px viewport, before this function existed:
 * `intro`'s pin entered the viewport at scrollY 71 and its adapter was built at
 * scrollY 431 — **360px of scrolling with an empty panel on screen**, which then
 * popped into frame 0. Parked at scrollY 300 the pin occupied 229px of the
 * viewport and contained zero children. All three scenes did it (360px, 180px,
 * 360px), so it was never one scene's problem.
 *
 * Nothing errors, no test that only checks progress arithmetic notices, and the
 * page looks correct in every screenshot taken while a scene is scrubbing —
 * which is why this is stated at length rather than left as a `Math.max`.
 *
 * The unload side matters for the same reason and is easier to miss: it happens
 * to be safe at `DEFAULT_MARGINS` for any scene at least 3 viewports tall
 * (`viewport / length <= 0.5`), and a 200vh scene would unmount while still on
 * screen.
 */
export function withPinVisibility(
  margins: SceneMargins,
  viewportHeight: number,
  length: number,
): SceneMargins {
  /* A scene with no length cannot scrub and the ratio is meaningless — division
   * would hand back Infinity or NaN, which compares false against everything and
   * would silently unmount the scene at every position. */
  if (!(length > 0) || !(viewportHeight > 0)) return margins;

  const visibility = viewportHeight / length;

  return {
    preload: Math.max(margins.preload, visibility),
    unload: Math.max(margins.unload, visibility),
  };
}

/**
 * What the engine should be doing with a scene right now.
 *
 * - `unmounted` — no adapter exists. Nothing is in memory.
 * - `preloading` — the adapter exists and its assets are loading, but it is not
 *   being scrubbed. This is both the approach *and* the departure: a scene just
 *   past its end stays warm so scrubbing back up is instant rather than a
 *   rebuild. **Not scrubbed does not mean not drawn**: the engine holds such a
 *   scene at its boundary frame — 0 before it, 1 after it — because a mounted
 *   scene that is still partly on screen must show the frame its scroll
 *   position implies. That costs one `seek` on entering the band; the engine's
 *   epsilon guard suppresses the rest.
 * - `active` — inside the scene's own span; `seek` is called every frame.
 */
export type SceneLifecycleState = "unmounted" | "preloading" | "active";

/**
 * Map a scene's raw (unclamped) progress to its lifecycle state.
 *
 * With `DEFAULT_MARGINS` the bands are:
 *
 * ```
 *   raw:  -0.25             0                    1                 1.5
 *  ────────┬────────────────┬────────────────────┬──────────────────┬────────
 *  unmounted │  preloading  │       active       │    preloading    │ unmounted
 * ```
 *
 * Boundaries are half-open on the outside and closed on the active band:
 * `-0.25` is already preloading, `1.5` is already unmounted, and both `0` and
 * `1` are active. The active check runs first deliberately — with zero margins
 * the two preloading bands collapse to nothing, and a naive ordering would
 * declare a scene unmounted at exactly progress `1`, which is a real frame that
 * still has to be drawn.
 *
 * Pass {@link sceneProgress}'s output directly; a clamped value would report
 * every scene on the page as `active` forever.
 */
export function sceneLifecycle(
  raw: number,
  margins: SceneMargins,
): SceneLifecycleState {
  if (raw >= 0 && raw <= 1) return "active";
  if (raw >= -margins.preload && raw < 1 + margins.unload) return "preloading";
  return "unmounted";
}
